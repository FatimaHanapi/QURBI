const mysql = require('mysql2/promise');

const api = 'http://localhost:3000/api';
const stamp = Date.now();
const testEmails = [`reservation-a-${stamp}@example.test`, `reservation-b-${stamp}@example.test`];
const password = 'ReservationTest123!';

async function request(path, { token, method = 'GET', body, headers = {} } = {}) {
  const response = await fetch(`${api}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json().catch(() => null);
  return { status: response.status, data };
}

async function main() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'qurbidb',
  });
  const createdUserIds = [];
  const touchedLivestock = [];
  try {
    const [stock] = await db.query(
      "SELECT id, status, soldAt FROM livestock WHERE status = 'available' ORDER BY createdAt LIMIT 2",
    );
    if (stock.length < 2) throw new Error('Two available livestock records are required');
    touchedLivestock.push(...stock);

    const tokens = [];
    for (let index = 0; index < 2; index += 1) {
      const registered = await request('/auth/register', {
        method: 'POST',
        body: {
          email: testEmails[index],
          password,
          fullName: `Reservation Test ${index + 1}`,
          role: 'buyer',
        },
      });
      if (registered.status >= 300) throw new Error(`Register failed: ${JSON.stringify(registered)}`);
      const loggedIn = await request('/auth/login', {
        method: 'POST',
        body: { email: testEmails[index], password },
      });
      if (loggedIn.status !== 200) throw new Error(`Login failed: ${JSON.stringify(loggedIn)}`);
      tokens.push(loggedIn.data.accessToken);
      createdUserIds.push(loggedIn.data.user.id);
    }

    const add = (token, livestockId) => request('/cart-items', {
      token,
      method: 'POST',
      body: { itemType: 'livestock', livestockId, quantity: 1 },
    });
    const checkout = (token) => request('/orders/checkout', {
      token,
      method: 'POST',
      body: {
        deliveryMethod: 'delivery',
        deliveryAddress: {
          recipientName: 'Reservation Test',
          recipientPhone: '0100000000',
          addressLine1: 'Test address',
          city: 'Test City',
          state: 'Selangor',
          postcode: '43000',
          country: 'Malaysia',
        },
      },
    });

    await Promise.all([add(tokens[0], stock[0].id), add(tokens[1], stock[0].id)]);
    const race = await Promise.all([checkout(tokens[0]), checkout(tokens[1])]);
    const winnerIndex = race.findIndex((result) => result.status === 201);
    const loserIndex = winnerIndex === 0 ? 1 : 0;
    if (winnerIndex < 0 || race[loserIndex].status !== 409) {
      throw new Error(`Race protection failed: ${JSON.stringify(race)}`);
    }
    const order = race[winnerIndex].data[0];
    const [[reservationBefore]] = await db.query(
      'SELECT id, orderId, expiresAt, status FROM reservations WHERE livestockId = ? AND status = ?',
      [stock[0].id, 'active'],
    );
    if (!reservationBefore) throw new Error('Active reservation was not created');

    const failedPayment = await request(`/orders/${order.id}/payment-failed`, {
      token: tokens[winnerIndex],
      method: 'POST',
      body: {},
    });
    const [[afterFailure]] = await db.query(
      'SELECT o.status orderStatus, o.paymentStatus, r.status reservationStatus FROM orders o JOIN reservations r ON r.orderId=o.id WHERE o.id=?',
      [order.id],
    );
    if (failedPayment.status !== 201 || afterFailure.orderStatus !== 'pending_payment' || afterFailure.paymentStatus !== 'failed' || afterFailure.reservationStatus !== 'active') {
      throw new Error(`Failed payment released the reservation: ${JSON.stringify(afterFailure)}`);
    }

    const loserAvailability = await request(`/livestock/${stock[0].id}/availability`, { token: tokens[loserIndex] });
    const winnerAvailability = await request(`/livestock/${stock[0].id}/availability`, { token: tokens[winnerIndex] });
    const publicDetail = await request(`/livestock/${stock[0].id}`);
    const publicBrowse = await request('/livestock?limit=100');
    const browseRows = publicBrowse.data?.data || [];
    const loserAdd = await add(tokens[loserIndex], stock[0].id);
    if (loserAvailability.data.state !== 'reserved' || winnerAvailability.data.state !== 'reserved_by_you') {
      throw new Error('Reservation ownership availability states are incorrect');
    }
    if (publicDetail.status !== 404 || browseRows.some((item) => item.id === stock[0].id) || loserAdd.status !== 409) {
      throw new Error('Reserved livestock remains accessible to another buyer');
    }

    const relogin = await request('/auth/login', {
      method: 'POST',
      body: { email: testEmails[winnerIndex], password },
    });
    const retryToken = relogin.data.accessToken;
    await add(retryToken, stock[0].id);
    const retry = await checkout(retryToken);
    const [[reservationAfter]] = await db.query(
      'SELECT id, orderId, expiresAt, status FROM reservations WHERE livestockId = ? AND status = ?',
      [stock[0].id, 'active'],
    );
    const [[counts]] = await db.query(
      'SELECT (SELECT COUNT(*) FROM reservations WHERE livestockId = ?) reservations, (SELECT COUNT(*) FROM payments WHERE orderId = ?) payments, (SELECT COUNT(*) FROM orders WHERE checkoutKey = ?) ordersCount',
      [stock[0].id, order.id, order.checkoutKey],
    );
    if (retry.status !== 201 || retry.data[0].id !== order.id || reservationAfter.id !== reservationBefore.id || new Date(reservationAfter.expiresAt).getTime() !== new Date(reservationBefore.expiresAt).getTime() || counts.reservations !== 1 || counts.payments !== 1 || counts.ordersCount !== 1) {
      throw new Error('Idempotent retry created a duplicate or reset the expiry');
    }

    const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET || 'local-reservation-test-secret';
    const complete = await request(`/orders/${order.id}/payment-webhook`, {
      method: 'POST',
      body: { providerReference: `test-${stamp}` },
      headers: { 'x-qurbi-payment-webhook-secret': webhookSecret },
    });
    const repeatedComplete = await request(`/orders/${order.id}/payment-webhook`, {
      method: 'POST',
      body: { providerReference: `test-${stamp}` },
      headers: { 'x-qurbi-payment-webhook-secret': webhookSecret },
    });
    const [[completed]] = await db.query(
      'SELECT o.status orderStatus, o.paymentStatus, r.status reservationStatus, l.status livestockStatus FROM orders o JOIN reservations r ON r.orderId=o.id JOIN livestock l ON l.id=r.livestockId WHERE o.id=?',
      [order.id],
    );
    if (complete.status !== 201 || repeatedComplete.status !== 201 || completed.orderStatus !== 'paid' || completed.paymentStatus !== 'paid' || completed.reservationStatus !== 'completed' || completed.livestockStatus !== 'sold') {
      throw new Error('Atomic payment completion failed');
    }

    await add(tokens[0], stock[1].id);
    const expiryCheckout = await checkout(tokens[0]);
    if (expiryCheckout.status !== 201) throw new Error(`Expiry setup checkout failed: ${JSON.stringify(expiryCheckout)}`);
    const expiryOrder = expiryCheckout.data[0];
    await db.query('UPDATE reservations SET expiresAt = DATE_SUB(NOW(6), INTERVAL 1 SECOND) WHERE orderId = ?', [expiryOrder.id]);
    await request(`/livestock/${stock[1].id}/availability`, { token: tokens[0] });
    const [[expired]] = await db.query(
      'SELECT o.status orderStatus, o.cancellationReason, r.status reservationStatus, l.status livestockStatus FROM orders o JOIN reservations r ON r.orderId=o.id JOIN livestock l ON l.id=r.livestockId WHERE o.id=?',
      [expiryOrder.id],
    );
    if (expired.orderStatus !== 'cancelled' || expired.reservationStatus !== 'expired' || expired.livestockStatus !== 'available') {
      throw new Error(`Expiry processing failed: ${JSON.stringify(expired)}`);
    }

    console.log(JSON.stringify({
      race: { winnerStatus: race[winnerIndex].status, loserStatus: race[loserIndex].status },
      pendingPayment: true,
      failedPayment: afterFailure,
      ownership: { owner: winnerAvailability.data.state, otherBuyer: loserAvailability.data.state },
      directAccessStatus: publicDetail.status,
      hiddenFromBrowse: !browseRows.some((item) => item.id === stock[0].id),
      otherBuyerAddStatus: loserAdd.status,
      idempotency: counts,
      expiryUnchanged: true,
      completion: completed,
      repeatedCompletionStatus: repeatedComplete.status,
      expiry: expired,
    }, null, 2));
  } finally {
    if (createdUserIds.length) {
      const [testOrders] = await db.query('SELECT id FROM orders WHERE buyerId IN (?)', [createdUserIds]);
      const orderIds = testOrders.map((order) => order.id);
      if (orderIds.length) {
        await db.query('DELETE FROM order_tracking_events WHERE orderId IN (?)', [orderIds]);
        await db.query('DELETE FROM reservations WHERE orderId IN (?)', [orderIds]);
        await db.query('DELETE FROM payments WHERE orderId IN (?)', [orderIds]);
        await db.query('DELETE FROM order_items WHERE orderId IN (?)', [orderIds]);
        await db.query('DELETE FROM orders WHERE id IN (?)', [orderIds]);
      }
      await db.query('DELETE FROM users WHERE id IN (?)', [createdUserIds]);
    }
    for (const livestock of touchedLivestock) {
      await db.query('UPDATE livestock SET status = ?, soldAt = ? WHERE id = ?', [livestock.status, livestock.soldAt, livestock.id]);
    }
    await db.end();
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
