import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ReportData {
  id: string;
  studentId: string;
  rollNo: string;
  name: string;
  date: string;
  status: string;
  subject: string;
  classSection: string;
  createdAt?: string;
}

interface ReportTableProps {
  data: ReportData[];
  showAllPages?: boolean;
  compactPrint?: boolean;
}

export default function ReportTable({ data, showAllPages = false, compactPrint = false }: ReportTableProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(35);
  const [paginatedData, setPaginatedData] = useState<ReportData[]>([]);
  
  // Update pagination when screen size changes
  useEffect(() => {
    function handleResize() {
      setItemsPerPage(window.innerWidth < 768 ? 10 : 35);
    }
    
    // Set initial value
    handleResize();
    
    // Add event listener
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Update paginated data when dependencies change
  useEffect(() => {
    // If showAllPages is true, show all data without pagination
    if (showAllPages) {
      setPaginatedData(data);
      return;
    }
    
    const start = currentPage * itemsPerPage;
    const end = start + itemsPerPage;
    setPaginatedData(data.slice(start, end));
  }, [data, currentPage, itemsPerPage, showAllPages]);

  const totalPages = Math.ceil(data.length / itemsPerPage);
  
  // Format the date for display
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch (error) {
      return dateString;
    }
  };
  
  return (
    <div className="overflow-x-auto">
      <div className="min-w-full inline-block align-middle">
        <div className={`overflow-hidden border border-gray-300 shadow-md rounded-lg ${compactPrint ? 'print:border-0 print:shadow-none' : ''}`}>
          <Table className="min-w-full divide-y divide-gray-200">
            <TableHeader className="bg-gray-100">
              <TableRow className={`text-center text-black text-sm font-semibold ${compactPrint ? 'print:text-xs' : ''}`}>
                <TableHead className={`p-2 md:p-4 text-left ${compactPrint ? 'print:p-1 print:text-xs' : ''}`}>Roll No</TableHead>
                <TableHead className={`p-2 md:p-4 text-left ${compactPrint ? 'print:p-1 print:text-xs' : ''}`}>Name</TableHead>
                <TableHead className={`p-2 md:p-4 text-left ${compactPrint ? 'print:p-1 print:text-xs' : ''}`}>Class</TableHead>
                <TableHead className={`p-2 md:p-4 text-center ${compactPrint ? 'print:p-1 print:text-xs' : ''}`}>Date</TableHead>
                <TableHead className={`p-2 md:p-4 text-left ${compactPrint ? 'print:p-1 print:text-xs' : ''}`}>Subject</TableHead>
                <TableHead className={`p-2 md:p-4 text-center ${compactPrint ? 'print:p-1 print:text-xs' : ''}`}>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-200">
              {paginatedData.length > 0 ? (
                paginatedData.map((row: ReportData, index: number) => (
                  <TableRow 
                    key={`${row.id}-${index}`} 
                    className={`text-gray-700 ${index % 2 === 0 ? "bg-gray-50" : "bg-white"} hover:bg-gray-100 transition-colors`}
                  >
                    <TableCell className={`p-2 md:p-4 text-left text-xs md:text-sm whitespace-nowrap ${compactPrint ? 'print:p-1 print:text-xs' : ''}`}>
                      {row.rollNo || "N/A"}
                    </TableCell>
                    <TableCell className={`p-2 md:p-4 text-left text-xs md:text-sm whitespace-nowrap ${compactPrint ? 'print:p-1 print:text-xs' : ''}`}>
                      {row.name || "Unknown"}
                    </TableCell>
                    <TableCell className={`p-2 md:p-4 text-left text-xs md:text-sm whitespace-nowrap ${compactPrint ? 'print:p-1 print:text-xs' : ''}`}>
                      {row.classSection || "N/A"}
                    </TableCell>
                    <TableCell className={`p-2 md:p-4 text-center text-xs md:text-sm whitespace-nowrap ${compactPrint ? 'print:p-1 print:text-xs' : ''}`}>
                      {formatDate(row.date)}
                    </TableCell>
                    <TableCell className={`p-2 md:p-4 text-left text-xs md:text-sm whitespace-nowrap ${compactPrint ? 'print:p-1 print:text-xs' : ''}`}>
                      {row.subject || "N/A"}
                    </TableCell>
                    <TableCell className={`p-2 md:p-4 text-center text-xs md:text-sm whitespace-nowrap ${compactPrint ? 'print:p-1 print:text-xs' : ''}`}>
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${row.status === 'Present' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
                        ${compactPrint ? 'print:px-1 print:py-0.5 print:text-xs' : ''}`}>
                        {row.status || "Unknown"}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className={`p-4 text-center text-gray-500 ${compactPrint ? 'print:p-2 print:text-xs' : ''}`}>
                    No data available
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      
      {/* Only show pagination controls when not showing all pages and there's more than one page */}
      {!showAllPages && totalPages > 1 && (
        <div className="flex justify-between items-center mt-4 flex-wrap gap-2 print:hidden">
          <div className="text-xs text-gray-500">
            Showing {currentPage * itemsPerPage + 1} to {Math.min((currentPage + 1) * itemsPerPage, data.length)} of {data.length} entries
          </div>
          
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm"
              disabled={currentPage === 0} 
              onClick={() => setCurrentPage(currentPage - 1)}
              className="flex items-center gap-1"
            >
              <ChevronLeft size={16} />
              <span className="hidden sm:inline">Previous</span>
            </Button>
            
            <div className="px-2 py-1 text-sm text-gray-700 bg-white border border-gray-300 rounded">
              {currentPage + 1} / {totalPages}
            </div>
            
            <Button 
              variant="outline" 
              size="sm"
              disabled={currentPage === totalPages - 1} 
              onClick={() => setCurrentPage(currentPage + 1)}
              className="flex items-center gap-1"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
