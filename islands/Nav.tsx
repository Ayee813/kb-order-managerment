import { _ } from "../common/i18n.tsx";
import { NavProps } from "../common/types.ts";

export default function NavBar(props: NavProps) {
    const currentPath = (typeof globalThis !== "undefined" && globalThis.location) ? globalThis.location.pathname : props.url;
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
                        <div class="nav-icon">
                            <img
                                src={isActive("/") ? "/assets/svg/home-active.svg" : "/assets/svg/home.svg"}
                                alt="Home"
                                width={24}
                                height={24}
                            />
                        </div>
                        <span class="nav-label desktop-label">{_('dashboard')}</span>
                        <span class="nav-label mobile-label">Home</span>
                    </a>
                    <a href="/orders" class={`nav-link ${isActive("/orders")}`}>
                        <div class="nav-icon">
                            <img
                                src={isActive("/orders") ? "/assets/svg/order-active.svg" : "/assets/svg/order.svg"}
                                alt="Orders"
                                width={24}
                                height={24}
                            />
                        </div>
                        <span class="nav-label desktop-label">{_('order-management')}</span>
                        <span class="nav-label mobile-label">Orders</span>
                    </a>
                    <a href="/bill-printing" class={`nav-link ${isActive("/bill-printing")}`}>
                        <div class="nav-icon">
                            <img
                                src={isActive("/bill-printing") ? "/assets/svg/print-active.svg" : "/assets/svg/print.svg"}
                                alt="Bills"
                                width={24}
                                height={24}
                            />
                        </div>
                        <span class="nav-label desktop-label">{_('bill-printing')}</span>
                        <span class="nav-label mobile-label">Bills</span>
                    </a>
                </div>
            </div>

            <style jsx>{`
                .nav-container {
                    background-color: var(--back);
                    border-bottom: 1px solid var(--gray-1); /* Only visible on desktop/top bar */
                    position: sticky;
                    top: 0;
                    z-index: 100;
                    width: 100%;
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
                    display: flex;
                    flex-direction: row; /* Desktop default */
                    align-items: center;
                    gap: 0.5rem;
                    text-decoration: none;
                    color: var(--gray-2);
                    font-weight: 500;
                    font-size: 0.95rem;
                    padding: 0.5rem 0.75rem;
                    border-radius: 6px;
                    transition: all 0.2s;
                    border: none;
                    background: none;
                    cursor: pointer;
                }
                .nav-icon {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 24px;
                    height: 24px;
                }
                
                /* Label visibility control */
                .mobile-label { display: none; }
                .desktop-label { display: block; }

                .nav-link:hover, .nav-link.active {
                    /* For image icons, we might not want background color on active if the icon itself indicates active state clearly, 
                       but keeping it for now as it provides a touch target area */
                    color: var(--primary-color);
                    background-color: var(--secondary-color);
                }
                
                @media (max-width: 768px) {
                    /* Mobile/Tablet Styles */
                    .mobile-label { display: block; }
                    .desktop-label { display: none; }

                    .nav-container {
                        border-bottom: 1px solid var(--gray-1);
                    }
                    
                    /* Keep brand at top */
                    .nav-content {
                        justify-content: center; /* Center logo on mobile header */
                    }
                    .nav-brand {
                        margin-bottom: 0;
                    }

                    /* Move links to bottom fixed bar */
                    .nav-links-wrapper {
                        position: fixed;
                        bottom: 0;
                        left: 0;
                        right: 0;
                        background-color: var(--back); /* Ensure solid background */
                        border-top: 1px solid var(--gray-1);
                        padding: 0.5rem 1rem; /* Adjust padding for touch targets */
                        padding-bottom: max(0.5rem, env(safe-area-inset-bottom)); /* Safe area for iPhone X+ */
                        justify-content: space-around; /* Distribute evenly */
                        gap: 0; /* Remove gap, handle spacing via justify-content */
                        z-index: 101; /* Above other content */
                        box-shadow: 0 -2px 10px rgba(0,0,0,0.05); /* Subtle shadow for depth */
                    }

                    .nav-link {
                        flex-direction: column; /* Stack icon and text */
                        gap: 0.25rem;
                        font-size: 0.75rem; /* Smaller text for bottom nav */
                        padding: 0.5rem;
                        width: 100%; /* Hit area expands */
                        justify-content: center;
                        border-radius: 8px; /* Slightly rounder */
                    }
                    
                    /* Adjust active state for mobile - maybe less background heavy? */
                    .nav-link.active {
                        background-color: transparent; /* Clean look */
                        color: var(--primary-color);
                    }
                    .nav-link:hover {
                         background-color: rgba(0,0,0,0.03); /* Subtle hover */
                    }
                }
            `}</style>
        </nav>
    );
}
