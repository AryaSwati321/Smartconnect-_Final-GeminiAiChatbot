export default function BookingModal({ provider, onClose, onConfirm }) {
  if (!provider) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center">
      <div className="bg-white p-6 rounded w-96">
        <h2 className="text-lg font-bold mb-2">
          Confirm Booking
        </h2>

        <p className="mb-4">{provider.name}</p>

        <div className="flex justify-end gap-3">
          <button onClick={onClose}>Cancel</button>
          <button
            onClick={onConfirm}
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
