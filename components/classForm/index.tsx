import { Button } from "@/components/ui-elements/button";

interface ClassInputFormProps {
  onClose?: () => void;
}

export default function ClassInputForm({ onClose }: ClassInputFormProps) {
  return (
    <div className="max-w-lg mx-auto bg-white rounded-lg p-6 shadow-md">
      <h2 className="text-lg font-semibold text-gray-700 mb-4">Subject Info</h2>
      
      <div className="space-y-4">
        {/* Subject Name Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Subject Name</label>
          <input
            type="text"
            placeholder="Input Name of Subject"
            className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Select Class Dropdown */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Select Class</label>
          <select
            className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            defaultValue="SE MME"
          >
            <option value="SE MME">SE MME</option>
            <option value="TE MME">TE MME</option>
            <option value="BE MME">BE MME</option>
          </select>
        </div>
      </div>

      {/* Add Subject Button */}
      <Button className="w-full mt-5" label="Add Subject" variant="dark" shape="rounded" />
    </div>
  );
}
