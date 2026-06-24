export default function ProviderCard({ provider, onBook }) {
  return (
    <div className="border p-4 rounded mb-3 flex justify-between">
      <div>
        <h3 className="font-bold">{provider.name}</h3>
        <p className="text-sm text-gray-600">
          {provider.distanceKm} km away
        </p>
      </div>

      <button
        onClick={() => onBook(provider)}
        className="bg-indigo-600 text-white px-4 py-2 rounded"
      >
        Book
      </button>
    </div>
  );
}
