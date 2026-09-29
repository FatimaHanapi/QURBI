import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, Search } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

export default function PageNotFound() {
    const { t } = useTranslation('common');
    const { t: ta } = useTranslation('account');
    const location = useLocation();
    const pageName = location.pathname.substring(1);

    const { user, isAuthenticated, authChecked } = useAuth();

    return (
        <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#E3C19F] to-[#F7EDE2] p-5">
            <div className="w-full max-w-md rounded-3xl border border-[#E3C19F] bg-[#FFFDF9] p-6 text-center shadow-xl shadow-[#41362D]/15">
                <p className="text-6xl font-bold text-[#6B594A]/60" aria-hidden="true">404</p>
                <h1 className="mt-3 text-2xl font-bold text-[#41362D]">
                    {t('pageNotFound.title')}
                </h1>
                <p className="mt-2 break-words text-[15px] leading-relaxed text-[#5A493C]">
                    {t('pageNotFound.description', { pageName })}
                </p>

                {/* Admin Note */}
                {authChecked && isAuthenticated && user?.role === 'admin' && (
                    <div className="mt-5 rounded-xl border border-[#E9B949] bg-[#FDF0D5] p-4 text-left">
                        <p className="text-sm font-bold text-[#7A4B00]">{t('pageNotFound.adminNoteTitle')}</p>
                        <p className="mt-1 text-sm leading-relaxed text-[#7A4B00]">
                            {t('pageNotFound.adminNoteBody')}
                        </p>
                    </div>
                )}

                <div className="mt-6 grid gap-3">
                    <Link
                        to="/"
                        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#41362D] to-[#6B594A] px-4 text-[15px] font-bold text-white shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A9825F] focus-visible:ring-offset-2"
                    >
                        <Home className="h-4 w-4" aria-hidden="true" />
                        {t('pageNotFound.goHome')}
                    </Link>
                    <Link
                        to="/browse"
                        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 border-[#6B594A] px-4 text-[15px] font-bold text-[#41362D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A9825F]"
                    >
                        <Search className="h-4 w-4" aria-hidden="true" />
                        {ta('notFound.browse')}
                    </Link>
                </div>
            </div>
        </main>
    )
}
