/**
 * Add Widget Button Component
 *
 * A placeholder button that appears in the dashboard grid to allow users
 * to add new financial data widgets. Features a dashed border design and
 * hover effects to clearly indicate its interactive nature.
 *
 * This component triggers the AddWidgetModal when clicked, which is handled
 * by the parent dashboard component through the widget store.
 *
 * @returns JSX element representing the add widget button
 */
export default function AddWidget() {
  return (
    <div className="border-2 border-dashed border-slate-600 rounded-lg p-8 flex flex-col items-center justify-center text-center min-h-[200px] hover:border-slate-400 transition-colors cursor-pointer">
      {/* Circular icon container with plus symbol */}
      <div className="w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center mb-4">
        <svg
          className="w-6 h-6 text-gray-400 hover:text-gray-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
          />
        </svg>
      </div>

      {/* Add widget text and description */}
      <h3 className="text-white font-medium text-lg mb-2">Add Widget</h3>
      <p className="text-gray-400 text-sm">
        Connect to a financial API and create a custom widget
      </p>
    </div>
  );
}
