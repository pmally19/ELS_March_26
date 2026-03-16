import { useLocation } from "wouter";

export default function TestDynamicRoute() {
  const [location, navigate] = useLocation();
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Test Dynamic Route</h1>
      <p className="mb-4">Current location: {location}</p>
      <p className="mb-4">Order ID: {location.split('/').pop()}</p>
      <button 
        onClick={() => navigate('/sales/orders')}
        className="px-4 py-2 bg-blue-500 text-white rounded"
      >
        Back to Orders
      </button>
    </div>
  );
}
