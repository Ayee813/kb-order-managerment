import { useEffect, useState } from "preact/hooks";
import { _ } from "../common/i18n.tsx";
import { Icons } from "../common/icons.tsx";

// Simplified Order interface for Dashboard
interface Order {
    Order_ID: string;
    Customer_Name: string;
    Product: string;
    Price: string;
    Qty: string;
    Status: string;
    // We only need a subset for the dashboard
}

export default function Dashboard() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalRevenue: 0,
        totalOrders: 0,
        pendingOrders: 0,
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch("/api/google?action=list").then((r) => r.json());
                if (res.data) {
                    const rows = res.data as string[][];
                    // Skip header
                    const dataRows = rows.slice(1);

                    let revenue = 0;
                    let pending = 0;
                    const parsedOrders: Order[] = [];

                    dataRows.forEach(row => {
                        // Headers indices based on known structure:
                        // 0:ID, 1:Name, 3:Product, 4:Price, 5:Qty, 9:Status
                        const price = parseFloat(row[4]?.replace(/[^0-9.-]+/g, "") || "0");
                        const qty = parseFloat(row[5]?.replace(/[^0-9.-]+/g, "") || "0");
                        const status = row[9] || "";

                        revenue += price * qty;
                        if (status.toUpperCase().includes("PENDING") || status.toLowerCase().includes("process")) {
                            pending++;
                        }

                        parsedOrders.push({
                            Order_ID: row[0],
                            Customer_Name: row[1],
                            Product: row[3],
                            Price: row[4],
                            Qty: row[5],
                            Status: status,
                        });
                    });

                    setStats({
                        totalRevenue: revenue,
                        totalOrders: dataRows.length,
                        pendingOrders: pending,
                    });

                    // Keep only recent 5 orders, reversed
                    setOrders(parsedOrders.reverse().slice(0, 5));
                }
            } catch (error) {
                console.error("Dashboard fetch error:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
        // Adjust currency locale if needed, assuming USD/Generic for now based on context
    };

    const getStatusBadge = (status: string) => {
        const s = status.toUpperCase();
        let cls = "badge-default";
        if (s.includes("COMPLETE") || s.includes("DELIVERED") || s.includes("DONE")) cls = "badge-success";
        else if (s.includes("PENDING") || s.includes("PROCESS")) cls = "badge-warning";
        else if (s.includes("CANCEL") || s.includes("FAIL")) cls = "badge-danger";

        return <span class={`badge ${cls}`}>{status}</span>;
    };

    return (
        <div class="kitty-canvas dashboard-container">
            <div class="dashboard-header">
                <h2 class="welcome-text">{_('Hello, Owner!')} 👋</h2>
                <p class="subtitle-text">{_("Here is what's happening in your store today.")}</p>
            </div>

            {/* Quick Actions */}
            <div class="quick-actions">
                <a href="/orders" class="btn btn-primary action-btn">
                    <Icons.IconPlus /> {_('New Order')}
                </a>
                <a href="/bill-printing" class="btn btn-ghost action-btn">
                    <Icons.IconPrinter /> {_('Print Bills')}
                </a>
            </div>

            {/* KPI Grid */}
            <div class="dashboard-grid">
                <div class="card kpi-card">
                    <div class="kpi-content">
                        <div class="kpi-icon-wrapper bg-blue">
                            <Icons.IconClipboardPlus size={24} />
                        </div>
                        <div>
                            <div class="stat-label">{_('Total Orders')}</div>
                            <div class="stat-value">{loading ? "-" : stats.totalOrders}</div>
                        </div>
                    </div>
                </div>

                <div class="card kpi-card">
                    <div class="kpi-content">
                        <div class="kpi-icon-wrapper bg-orange">
                            <Icons.IconLoader2 size={24} />
                        </div>
                        <div>
                            <div class="stat-label">{_('Pending')}</div>
                            <div class="stat-value">{loading ? "-" : stats.pendingOrders}</div>
                        </div>
                    </div>
                </div>

                <div class="card kpi-card">
                    <div class="kpi-content">
                        <div class="kpi-icon-wrapper bg-green">
                            <Icons.IconTextIncrease size={24} />
                        </div>
                        <div>
                            <div class="stat-label">{_('Est. Revenue')}</div>
                            <div class="stat-value">{loading ? "-" : formatCurrency(stats.totalRevenue)}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Orders */}
            <div class="recent-orders-section">
                <div class="section-header">
                    <h3 class="section-title">{_('Recent Activity')}</h3>
                    <a href="/orders" class="view-all-link">{_('View All')}</a>
                </div>

                <div class="modern-table-container">
                    {loading ? (
                        <div class="loading-state">{_('Loading recent activity...')}</div>
                    ) : (
                        <table class="modern-table">
                            <thead>
                                <tr>
                                    <th>{_('Order ID')}</th>
                                    <th>{_('Customer')}</th>
                                    <th>{_('Product')}</th>
                                    <th>{_('Amount')}</th>
                                    <th>{_('Status')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.length > 0 ? orders.map(o => (
                                    <tr key={o.Order_ID}>
                                        <td data-label="Order ID">{o.Order_ID}</td>
                                        <td data-label="Customer">
                                            <span class="customer-name">{o.Customer_Name}</span>
                                        </td>
                                        <td data-label="Product" class="product-cell">{o.Product}</td>
                                        <td data-label="Amount" class="amount-cell">{o.Price}</td>
                                        <td data-label="Status">{getStatusBadge(o.Status)}</td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={5} class="empty-state">{_('No recent orders.')}</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            <style jsx>{`
                .dashboard-container {
                    padding: 2rem;
                    width: 100%;
                    max-width: 1200px;
                    margin: 0 auto;
                    /* Add padding bottom to account for mobile nav bar */
                    padding-bottom: 80px; 
                }
                
                .dashboard-header {
                    margin-bottom: 2rem;
                }
                .welcome-text {
                    font-size: 2rem;
                    margin-bottom: 0.5rem;
                    font-weight: 700;
                    color: var(--text-color);
                }
                .subtitle-text {
                    color: var(--gray-2);
                    font-size: 1.1rem;
                }

                .quick-actions {
                    display: flex;
                    gap: 1rem;
                    margin-bottom: 2rem;
                }
                .action-btn {
                    padding: 0.75rem 1.5rem;
                    font-size: 1rem;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }

                /* Grid Layout */
                .dashboard-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                    gap: 1.5rem;
                    margin-bottom: 3rem;
                }
                
                .kpi-card {
                    padding: 1.5rem;
                    border-radius: 16px;
                    border: 1px solid var(--gray-1);
                    background: var(--back);
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
                    transition: transform 0.2s ease;
                }
                .kpi-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);
                }
                
                .kpi-content {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }
                .kpi-icon-wrapper {
                    padding: 12px;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .bg-blue { background: #e0f2fe; color: #0284c7; }
                .bg-orange { background: #fff7ed; color: #ea580c; }
                .bg-green { background: #ecfccb; color: #65a30d; }
                
                .stat-label {
                    color: var(--gray-2);
                    font-size: 0.9rem;
                    font-weight: 500;
                    margin-bottom: 0.25rem;
                }
                .stat-value {
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: var(--text-color);
                    line-height: 1;
                }

                /* Recent Activity */
                .section-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1.5rem;
                }
                .section-title {
                    font-size: 1.25rem;
                    font-weight: 600;
                    color: var(--text-color);
                }
                .view-all-link {
                    color: var(--primary-color);
                    text-decoration: none;
                    font-weight: 600;
                    font-size: 0.95rem;
                }
                .view-all-link:hover {
                    text-decoration: underline;
                }

                .modern-table-container {
                    background: var(--back);
                    border-radius: 16px;
                    border: 1px solid var(--gray-1);
                    overflow: hidden;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
                    margin-top: 0;
                }
                
                .modern-table {
                    width: 100%;
                    border-collapse: collapse;
                }
                .modern-table th {
                    background: var(--gray-1); /* Slight bg for header */
                    color: var(--gray-2);
                    font-weight: 600;
                    text-align: left;
                    padding: 1rem 1.5rem;
                    font-size: 0.9rem;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }
                .modern-table td {
                    padding: 1rem 1.5rem;
                    border-bottom: 1px solid var(--gray-1);
                    color: var(--text-color);
                    font-size: 0.95rem;
                }
                .modern-table tr:last-child td {
                    border-bottom: none;
                }
                
                .customer-name {
                    font-weight: 500;
                }
                .amount-cell {
                    font-weight: 600;
                }
                
                .loading-state, .empty-state {
                    padding: 3rem;
                    text-align: center;
                    color: var(--gray-2);
                }

                @media (max-width: 768px) {
                    .dashboard-container {
                        padding: 1rem;
                         /* More bottom padding for nav bar + safety */
                        padding-bottom: 100px;
                    }
                    
                    .welcome-text {
                        font-size: 1.75rem;
                    }
                    
                    /* Make grid stack nicely */
                    .dashboard-grid {
                        grid-template-columns: 1fr;
                        gap: 1rem;
                    }
                    
                    /* Responsive Table: Card View for Mobile */
                    .modern-table thead {
                        display: none;
                    }
                    .modern-table, .modern-table tbody, .modern-table tr, .modern-table td {
                        display: block;
                        width: 100%;
                    }
                    .modern-table tr {
                        margin-bottom: 1rem;
                        background: var(--back);
                        border-radius: 12px;
                        border: 1px solid var(--gray-1);
                        padding: 1rem;
                    }
                    .modern-table td {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 0.5rem 0;
                        border: none;
                        text-align: right;
                    }
                    .modern-table td::before {
                        content: attr(data-label);
                        float: left;
                        font-weight: 600;
                        color: var(--gray-2);
                        font-size: 0.85rem;
                    }
                    /* Special case for status to be full width or right aligned properly */
                }
            `}</style>
        </div>
    );
}
