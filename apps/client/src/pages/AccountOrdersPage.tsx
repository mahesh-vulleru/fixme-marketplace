import React, { useEffect, useState } from 'react';
import { apiFetch, formatINRFromPaise } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export const AccountOrdersPage: React.FC = () => {
  const { user, refreshSession } = useAuth();
  const [activeTab, setActiveTab] = useState<'orders' | 'wishlist' | 'profile' | 'notifications'>('orders');

  const [orders, setOrders] = useState<any[]>([]);
  const [wishlist, setWishlist] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Profile state
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // Return request modal state
  const [returnTarget, setReturnTarget] = useState<{ orderId: string; subOrderId: string } | null>(null);
  const [returnReason, setReturnReason] = useState<'defective' | 'wrong_part' | 'not_as_described' | 'damaged_in_transit'>('defective');
  const [returnDescription, setReturnDescription] = useState('');

  // Review state
  const [reviewTarget, setReviewTarget] = useState<{ orderId: string; subOrderId: string; listingId: string } | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  const loadAccountData = async () => {
    setLoading(true);
    try {
      const [ordersData, wishlistData, notifData] = await Promise.all([
        apiFetch<any[]>('/orders/my').catch(() => []),
        apiFetch<{ items: any[] }>('/wishlist').then((r) => r.items).catch(() => []),
        apiFetch<any[]>('/notifications').catch(() => [])
      ]);
      setOrders(ordersData);
      setWishlist(wishlistData);
      setNotifications(notifData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccountData();
  }, []);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName);
      setPhone(user.phone || '');
    }
  }, [user]);

  const handleCancelOrder = async (orderId: string) => {
    setError(null);
    setMessage(null);
    try {
      await apiFetch(`/orders/${orderId}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'Customer requested cancellation before dispatch' })
      });
      setMessage('Order cancelled and reserved inventory restored.');
      await loadAccountData();
    } catch (err: any) {
      setError(err.message || 'Unable to cancel order.');
    }
  };

  const handleSubmitReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnTarget) return;
    setError(null);
    setMessage(null);
    try {
      await apiFetch('/returns', {
        method: 'POST',
        body: JSON.stringify({
          orderId: returnTarget.orderId,
          subOrderId: returnTarget.subOrderId,
          reason: returnReason,
          description: returnDescription,
          evidenceAssetIds: []
        })
      });
      setMessage('Return / refund request submitted for inspection.');
      setReturnTarget(null);
      setReturnDescription('');
      await loadAccountData();
    } catch (err: any) {
      setError(err.message || 'Unable to submit return request.');
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewTarget) return;
    setError(null);
    setMessage(null);
    try {
      await apiFetch('/reviews', {
        method: 'POST',
        body: JSON.stringify({
          orderId: reviewTarget.orderId,
          subOrderId: reviewTarget.subOrderId,
          listingId: reviewTarget.listingId,
          rating: reviewRating,
          title: 'Verified Purchase Review',
          comment: reviewComment
        })
      });
      setMessage('Verified purchase review published.');
      setReviewTarget(null);
      setReviewComment('');
    } catch (err: any) {
      setError(err.message || 'Unable to submit review.');
    }
  };

  const handleRemoveWishlist = async (listingId: string) => {
    try {
      await apiFetch(`/wishlist/${listingId}`, { method: 'DELETE' });
      await loadAccountData();
    } catch (err: any) {
      setError(err.message || 'Could not update wishlist.');
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    try {
      await apiFetch('/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify({ fullName, phone: phone || undefined })
      });
      await refreshSession();
      setMessage('Profile updated.');
    } catch (err: any) {
      setError(err.message || 'Profile update failed.');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    try {
      const res = await apiFetch<{ message: string }>('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword: confirmNewPassword
        })
      });
      setMessage(res.message);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err: any) {
      setError(err.message || 'Password change failed.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#0f172a' }}>My Account & Orders</h1>
          <p style={{ margin: '0.25rem 0 0', color: '#64748b', fontSize: '0.9rem' }}>
            Signed in as <strong>{user?.fullName}</strong> ({user?.email})
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {(['orders', 'wishlist', 'profile', 'notifications'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '0.55rem 1rem',
                borderRadius: '8px',
                border: activeTab === tab ? '1px solid #2563eb' : '1px solid #cbd5e1',
                background: activeTab === tab ? '#eff6ff' : '#fff',
                color: activeTab === tab ? '#1d4ed8' : '#334155',
                fontWeight: 600,
                cursor: 'pointer',
                textTransform: 'capitalize'
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div role="alert" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '0.85rem 1rem', borderRadius: '8px' }}>
          {error}
        </div>
      )}
      {message && (
        <div role="status" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', padding: '0.85rem 1rem', borderRadius: '8px', fontWeight: 600 }}>
          {message}
        </div>
      )}

      {activeTab === 'orders' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {loading ? (
            <div style={{ background: '#fff', padding: '2rem', borderRadius: '12px', textAlign: 'center', color: '#64748b' }}>Loading your orders...</div>
          ) : orders.length === 0 ? (
            <div style={{ background: '#fff', padding: '2rem', borderRadius: '12px', textAlign: 'center', color: '#64748b', border: '1px solid #e2e8f0' }}>
              You have not placed any spare-part orders yet.
            </div>
          ) : (
            orders.map((order) => (
              <div key={order._id} style={{ background: '#fff', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <span style={{ fontWeight: 700, color: '#0f172a' }}>{order.orderNumber}</span>
                    <span style={{ marginLeft: '0.75rem', fontSize: '0.82rem', color: '#64748b' }}>
                      {new Date(order.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, padding: '0.25rem 0.6rem', borderRadius: '999px', background: '#f1f5f9', color: '#334155', textTransform: 'uppercase' }}>
                      {order.status} • {order.paymentStatus}
                    </span>
                    <span style={{ fontWeight: 800, color: '#0f172a' }}>
                      {formatINRFromPaise(order.grandTotalPaise)}
                    </span>
                    {!['shipped', 'delivered', 'cancelled', 'refunded'].includes(order.status) && (
                      <button
                        onClick={() => handleCancelOrder(order._id)}
                        style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '0.35rem 0.7rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                      >
                        Cancel Order
                      </button>
                    )}
                  </div>
                </div>

                {(order.subOrders || []).map((sub: any) => (
                  <div key={sub._id} style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '8px', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569' }}>
                        Vendor Sub-Order #{String(sub._id).slice(-6)} • Status: <strong>{sub.status}</strong>
                        {sub.trackingNumber && ` • Tracking: ${sub.courierName} (${sub.trackingNumber})`}
                      </span>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {sub.status === 'delivered' && (
                          <button
                            onClick={() => setReturnTarget({ orderId: order._id, subOrderId: sub._id })}
                            style={{ background: '#fff', border: '1px solid #cbd5e1', padding: '0.3rem 0.65rem', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
                          >
                            Request Return
                          </button>
                        )}
                      </div>
                    </div>
                    {(sub.items || []).map((item: any, idx: number) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', color: '#1e293b', padding: '0.25rem 0' }}>
                        <span>
                          {item.partNameSnapshot} ({item.skuSnapshot}) × {item.quantity}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span style={{ fontWeight: 600 }}>{formatINRFromPaise(item.lineTotalPaise)}</span>
                          {sub.status === 'delivered' && (
                            <button
                              onClick={() => setReviewTarget({ orderId: order._id, subOrderId: sub._id, listingId: item.listingId })}
                              style={{ background: '#eff6ff', color: '#1d4ed8', border: 'none', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                            >
                              Write Review
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))
          )}

          {returnTarget && (
            <form onSubmit={handleSubmitReturn} style={{ background: '#fff', padding: '1.25rem', borderRadius: '12px', border: '2px solid #2563eb' }}>
              <h3 style={{ margin: '0 0 0.75rem' }}>Submit Return & Refund Request</h3>
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                <select value={returnReason} onChange={(e) => setReturnReason(e.target.value as any)} style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                  <option value="defective">Defective / Dead on Arrival</option>
                  <option value="wrong_part">Wrong Part Sent</option>
                  <option value="not_as_described">Condition Not as Described</option>
                  <option value="damaged_in_transit">Damaged in Transit</option>
                </select>
                <textarea
                  value={returnDescription}
                  onChange={(e) => setReturnDescription(e.target.value)}
                  placeholder="Describe the issue and test steps performed (min 10 characters)..."
                  required
                  minLength={10}
                  rows={3}
                  style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="submit" style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '0.6rem 1rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                    Submit Return Request
                  </button>
                  <button type="button" onClick={() => setReturnTarget(null)} style={{ background: '#f1f5f9', border: 'none', padding: '0.6rem 1rem', borderRadius: '8px', cursor: 'pointer' }}>
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          )}

          {reviewTarget && (
            <form onSubmit={handleSubmitReview} style={{ background: '#fff', padding: '1.25rem', borderRadius: '12px', border: '2px solid #16a34a' }}>
              <h3 style={{ margin: '0 0 0.75rem' }}>Review Verified Spare Part</h3>
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                <select value={reviewRating} onChange={(e) => setReviewRating(Number(e.target.value))} style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                  <option value={5}>5 Stars — Perfect fit & working</option>
                  <option value={4}>4 Stars — Good quality</option>
                  <option value={3}>3 Stars — Acceptable</option>
                  <option value={2}>2 Stars — Subpar quality</option>
                  <option value={1}>1 Star — Defective / incompatible</option>
                </select>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Share how the repair went..."
                  required
                  minLength={5}
                  rows={3}
                  style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="submit" style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '0.6rem 1rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                    Publish Review
                  </button>
                  <button type="button" onClick={() => setReviewTarget(null)} style={{ background: '#f1f5f9', border: 'none', padding: '0.6rem 1rem', borderRadius: '8px', cursor: 'pointer' }}>
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      )}

      {activeTab === 'wishlist' && (
        <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <h2 style={{ margin: '0 0 1rem', fontSize: '1.2rem' }}>Saved Parts Wishlist</h2>
          {wishlist.length === 0 ? (
            <p style={{ color: '#64748b', margin: 0 }}>No saved listings in your wishlist yet.</p>
          ) : (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {wishlist.map((item) => (
                <div key={item._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{item.partId?.name || item.sku}</div>
                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Condition: {item.condition} • {formatINRFromPaise(item.pricePaise)}</div>
                  </div>
                  <button
                    onClick={() => handleRemoveWishlist(item._id)}
                    style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '0.4rem 0.75rem', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'profile' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          <form onSubmit={handleProfileUpdate} style={{ background: '#fff', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.15rem' }}>Profile Details</h2>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Full Name</label>
              <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Phone Number</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
            </div>
            <button type="submit" style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '0.7rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
              Save Profile Changes
            </button>
          </form>

          <form onSubmit={handleChangePassword} style={{ background: '#fff', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.15rem' }}>Update Password</h2>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Current Password</label>
              <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>New Strong Password</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Confirm New Password</label>
              <input type="password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} required style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
            </div>
            <button type="submit" style={{ background: '#0f172a', color: '#fff', border: 'none', padding: '0.7rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
              Change Password
            </button>
          </form>
        </div>
      )}

      {activeTab === 'notifications' && (
        <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <h2 style={{ margin: '0 0 1rem', fontSize: '1.2rem' }}>Account Notifications</h2>
          {notifications.length === 0 ? (
            <p style={{ color: '#64748b', margin: 0 }}>You have no notifications right now.</p>
          ) : (
            <div style={{ display: 'grid', gap: '0.65rem' }}>
              {notifications.map((n) => (
                <div key={n._id} style={{ padding: '0.85rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: n.isRead ? '#fff' : '#eff6ff' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{n.title}</div>
                  <div style={{ fontSize: '0.86rem', color: '#475569', marginTop: '0.2rem' }}>{n.message}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
