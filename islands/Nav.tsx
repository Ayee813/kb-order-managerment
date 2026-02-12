import { _ } from "../common/i18n.tsx";
import { NavProps } from "../common/types.ts";

export default function NavBar(props: NavProps) {
    const currentPath = typeof window !== "undefined" ? window.location.pathname : props.url;
    const isActive = (path: string) => currentPath === path ? "active" : "";

    return (
        <nav class="nav-container">
            <div class="nav-content">
                {/* Logo & Brand */}
                <div class="nav-brand">
                    <img
                        src="/assets/images/kb-store-removebg-preview.png"
                        alt="Logo"
                        width={40}
                        height={40}
                        class="nav-logo"
                    />
                    <h1 class="nav-title-text">{_('KB Store Management')}</h1>
                </div>

                {/* Navigation Links */}
                <div class="nav-links-wrapper">
                    <a href="/" class={`nav-link ${isActive("/")}`}>
                        {_('dashboard')}
                    </a>
                    <a href="/orders" class={`nav-link ${isActive("/orders")}`}>
                        {_('order-management')}
                    </a>
                    <a href="/bill-printing" class={`nav-link ${isActive("/bill-printing")}`}>
                        {_('bill-printing')}
                    </a>
                </div>
            </div>

            <style jsx>{`
                .nav-container {
                    background-color: var(--back);
                    border-bottom: 1px solid var(--gray-1);
                    position: sticky;
                    top: 0;
                    z-index: 100;
                }
                .nav-content {
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 0.75rem 1rem;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }
                .nav-brand {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                }
                .nav-title-text {
                    font-size: 1.25rem;
                    font-weight: 600;
                    margin: 0;
                    color: var(--text-color);
                }
                .nav-links-wrapper {
                    display: flex;
                    align-items: center;
                    gap: 1.5rem;
                }
                .nav-link {
                    text-decoration: none;
                    color: var(--gray-2);
                    font-weight: 500;
                    font-size: 0.95rem;
                    padding: 0.5rem 0.75rem;
                    border-radius: 6px;
                    transition: color 0.2s, background-color 0.2s;
                    border: none;
                    background: none;
                    cursor: pointer;
                }
                .nav-link:hover, .nav-link.active {
                    color: var(--primary-color);
                    background-color: var(--secondary-color);
                }
                
                @media (max-width: 768px) {
                    .nav-content {
                        flex-direction: column;
                        gap: 1rem;
                    }
                    .nav-links-wrapper {
                        gap: 0.5rem;
                        flex-wrap: wrap;
                        justify-content: center;
                    }
                }
            `}</style>
        </nav>
    );
}
