import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../services/api.js';
import PropertyCard from '../components/property/PropertyCard.jsx';

const AITripPlanner = () => {
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState(null); // { travelPlan, estimatedBudget, suggestedProperties }
  const [error, setError] = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      days: 3,
      budget: 15000,
    }
  });

  const onSubmit = async (formData) => {
    setLoading(true);
    setError('');
    setPlan(null);
    try {
      const { data } = await api.post('/ai/plan', {
        destination: formData.destination,
        budget: formData.budget,
        days: formData.days,
      });

      if (data.success) {
        setPlan(data);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate travel plan. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-pad" style={{ maxWidth: '1000px' }}>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <span style={{ backgroundColor: 'var(--brand-light)', color: 'var(--brand)', padding: '6px 14px', borderRadius: 'var(--border-radius-full)', fontSize: '0.75rem', fontWeight: 700 }}>
          Nestor AI Core
        </span>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 800, marginTop: '10px', marginBottom: '8px' }}>AI Vacation Itinerary Planner</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', maxWidth: '600px', margin: '0 auto' }}>
          Provide your destination, length of stay, and budget to generate a personalized timeline itinerary and matching stays.
        </p>
      </div>

      {/* Input Form Card */}
      <form onSubmit={handleSubmit(onSubmit)} style={{
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--border-radius-md)',
        padding: '30px',
        boxShadow: 'var(--shadow-sm)',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px',
        alignItems: 'end',
        marginBottom: '40px'
      }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Destination City</label>
          <input
            type="text"
            className="form-control"
            placeholder="e.g. Kyoto, Bali, New York"
            {...register('destination', { required: 'Destination is required' })}
          />
          {errors.destination && <p className="form-error" style={{ margin: 0 }}>{errors.destination.message}</p>}
        </div>

        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Total Budget (INR)</label>
          <input
            type="number"
            className="form-control"
            placeholder="INR"
            min="1000"
            {...register('budget', { required: 'Budget is required' })}
          />
          {errors.budget && <p className="form-error" style={{ margin: 0 }}>{errors.budget.message}</p>}
        </div>

        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Length of Stay (Days)</label>
          <input
            type="number"
            className="form-control"
            placeholder="Days"
            min="1"
            max="14"
            {...register('days', { required: 'Days is required' })}
          />
          {errors.days && <p className="form-error" style={{ margin: 0 }}>{errors.days.message}</p>}
        </div>

        <button type="submit" className="btn btn-brand" style={{ padding: '12px', height: '48px' }} disabled={loading}>
          {loading ? 'Generating...' : 'Plan My Trip'}
        </button>
      </form>

      {/* Error message */}
      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '40px' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Loading Placeholder */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{ border: '4px solid var(--border-color)', borderTop: '4px solid var(--brand)', borderRadius: '50%', width: '40px', height: '40px', margin: '0 auto 20px auto', animation: 'spin 1s linear infinite' }}></div>
          <h4 style={{ fontWeight: 700 }}>Whispering to our travel bots...</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Mapping rentals and generating daily activities.</p>
        </div>
      )}

      {/* Results Section */}
      {plan && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
          
          {/* Grid: 2 Columns - Itinerary (left) vs Cost breakdown (right) */}
          <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
            
            {/* Day timeline activities */}
            <div style={{ flex: '2 1 550px' }}>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '24px' }}>📅 Day-by-Day Schedule</h3>
              <div style={{ borderLeft: '3px solid var(--brand)', paddingLeft: '24px', marginLeft: '12px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
                {plan.travelPlan.map((day) => (
                  <div key={day.day} style={{ position: 'relative' }}>
                    {/* Circle Dot marker */}
                    <div style={{
                      position: 'absolute',
                      top: '4px',
                      left: '-37px',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--bg-primary)',
                      border: '4px solid var(--brand)',
                      display: 'flex',
                      alignItems: 'center',
                      justifycontent: 'center',
                      zIndex: 2
                    }} />

                    <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', padding: '20px', borderRadius: 'var(--border-radius-md)', boxShadow: 'var(--shadow-sm)' }}>
                      <h4 style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--brand)', marginBottom: '12px' }}>
                        Day {day.day}: {day.title}
                      </h4>
                      <ul style={{ paddingLeft: '16px', color: 'var(--text-secondary)', fontSize: '0.925rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {day.activities.map((act, idx) => (
                          <li key={idx}>{act}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Cost Breakdown card */}
            <div style={{ flex: '1 1 320px' }}>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '24px' }}>📊 Estimated Costs Breakdown</h3>
              <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-lg)', padding: '30px', boxShadow: 'var(--shadow-md)' }}>
                <h4 style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '20px' }}>ESTIMATED TOTAL</h4>
                <div style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '15px', marginBottom: '20px' }}>
                  INR {plan.estimatedBudget.total.toLocaleString()}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>🏠 Accommodation Stay:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>INR {plan.estimatedBudget.accommodation.toLocaleString()}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>🍔 Food & Dining:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>INR {plan.estimatedBudget.foodAndBeverage.toLocaleString()}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>🚕 Sightseeing & Cabs:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>INR {plan.estimatedBudget.sightseeingAndTransit.toLocaleString()}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>🎁 Miscellaneous:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>INR {plan.estimatedBudget.miscellaneous.toLocaleString()}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stays recommendations matching destination */}
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '40px', marginTop: '20px' }}>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '24px' }}>🏡 Stays Matched in this Area</h3>
            {plan.suggestedProperties.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>No rentals listed in this area yet. Try other cities!</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
                {plan.suggestedProperties.map((p) => (
                  <PropertyCard key={p._id} property={p} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default AITripPlanner;
