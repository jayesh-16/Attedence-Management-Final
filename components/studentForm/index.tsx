import { Button } from "@/components/ui-elements/button";

interface StudentsInputFormProps {
  onClose?: () => void;
}

export default function StudentsInputForm({ onClose }: StudentsInputFormProps) {
  return (
    <div className="max-w-lg mx-auto bg-white rounded-lg p-6 shadow-md">
      <h2 className="text-lg font-semibold text-gray-700 mb-4">Students Info</h2>
      
      <div className="space-y-4">
        {/* Name Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Name</label>
          <input
            type="text"
            placeholder="Input Name of Student"
            className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Roll Number Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Roll Number</label>
          <input
            type="number"
            placeholder="Input Roll Number of Student"
            className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Add Student Button */}
      <Button className="w-full mt-5" label="Add Student" variant="dark" shape="rounded" />
    </div>
  );
}
