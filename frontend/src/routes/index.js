import { createBrowserRouter } from "react-router-dom";
import App from "../App";
import Home from "../pages/Home";
import Login from "../pages/Login";
import Signup from "../pages/Signup";
import AdminDashboard from "../pages/AdminDashboard";
import EmailVerification from "../helpers/EmailVerification";
import SubAdminManager from "../pages/SubAdminManager";
import Dashboard from "../pages/Dashboard";
import UserManagement from "../pages/Users";
import ProductUpload from "../pages/ProductUpload";
import ManageCatalogs from "../pages/ManageCatalogs";
import CatalogView from "../pages/CatalogView";
import CatalogsPage from "../pages/CatalogsPage";
import CreateAICatalog from "../pages/CreateAICatalog";
import ViewersPage from "../pages/ViewersPage";
import ViewersManager from "../pages/ViewersManager";
import SelectProductsForViewer from "../pages/SelectProductsForViewer";
import ViewerDashboard from "../pages/ViewerDashboard";
import ViewerProductDetails from "../pages/ViewerProductDetails";
import AdminProductDetails from "../pages/AdminProductDetails";
import QuotationView from "../pages/QuotationView";
import ReviewDashboard from "../pages/ReviewDashboard";
import PrintQuotation from "../pages/PrintQuotation";
import ManageJobSheets from "../pages/ManageJobSheets";
import ManageCompanies from "../pages/ManageCompanies";
import CreateJobSheet from "../pages/CreateJobSheet";
import JobSheetView from "../pages/JobSheetView";
import ManageOpportunity from "../pages/ManageOpportunity";
import CreateOpportunity from "../pages/CreateOpportunity";
import ForgotPassword from "../pages/ForgotPassword";
import CreateOpenPurchase from "../pages/CreateOpenPurchase";
import OpenPurchaseList from "../pages/OpenPurchaseList";
import ClosedPurchaseList from "../pages/ClosedPurchaseList";
import CreatePurchaseInvoice from "../pages/CreatePurchaseInvoice";
import ManagePurchaseInvoice from "../pages/ManagePurchaseInvoice";
import CreateProductionJobsheet from "../pages/CreateProductionJobsheet";
import ManageProductionJobsheet from "../pages/ManageProductionJobsheet";
import ClosedProductionJobsheetList from "../pages/ClosedProductionJobsheetList";
import CreateProductionInvoice from "../pages/CreateProductionInvoice";
import ManageProductionInvoice from "../pages/ManageProductionInvoice";
import ClosedProductionJobsheet from "../pages/ClosedProductionJobsheet";
import ManagePendingPacking from "../pages/ManagePendingPacking";
import ManagePendingPackingClosed from "../pages/ManagePendingPackingClosed";
import ManageDispatchScheduled from "../pages/ManageDispatchScheduled";
import ManageDeliveryReports from "../pages/ManageDeliveryReports";
import ManageDeliveryCompleted from "../pages/ManageDeliveryCompleted";
import EditQuotation from "../pages/EditQuotation";
import InvoiceFollowUpPage from "../pages/InvoiceFollowUp";
import ManageInvoiceSummary from "../pages/ManageInvoiceSummary";
import ManagePaymentFollowUp from "../pages/ManagePaymentFollowUp";
import Samples from "../pages/Samples";
import SamplesOut from "../pages/SamplesOut";
import SampleStatus from "../pages/SampleStatus";
import ManageExpenses from "../pages/ManageExpenses";

import { ManageVendors } from "../components/manageVendors/manageVendors";
import ManagePotentialClients from "../pages/ManagePotentialClients";
import EventManager from "../pages/EventManager";
// import PotentialClientsList from "../pages/PotentialClientsList";
import CalendarPage from "../pages/CalendarPage";
import ManageSegments from "../pages/ManageSegments";
import ManageBrandingCharges from "../pages/ManageBrandingCharges";
import QuotationManagementPage from "../pages/QuotationManagementPage";
import LogsTable from "../pages/LogsTable";
import TaskManager from "../pages/TaskManager";
import DeliveryChallanManagementPage from "../pages/DeliveryChallanManagementPage";
import DeliveryChallan from "../components/examples/dc";
import ManageTicketsPage from "../pages/ManageTickets";
import EInvoiceTable from "../pages/EInvoiceTable";
import MapDashboard from "../pages/MapDashboard";
import ManageDestinations from "../pages/ManageDestinations";
import UserTrackingMap from "../pages/UserTrackingMap";
import AssignDestinations from "../pages/AssignDestinations";
import ManageInvoices from "../pages/ManageInvoices";
import InvoiceEditPage from "../pages/InvoiceEditPage";
import InvoicePrint from "../pages/InvoicePrint";
import EmployeesPage from "../pages/EmployeesPage";
import EmployeeDetailPage from "../pages/EmployeeDetailPage";
import AttendancePage from "../pages/AttendancePage";
import WfhPage from "../pages/WfhPage";
import LeavesPage from "../pages/LeavesPage";
import SalaryPage from "../pages/SalaryPage";
import PurchaseOrdersList from "../pages/PurchaseOrdersList";
import HolidaysPage from "../pages/HolidaysPage";
import MyProfile from "../pages/MyProfile";
import LeavesSuperAdminPage from "../pages/LeavesSuperAdminPage";
import FileManagement from "../pages/FileManagement";
import AttendanceSummaryPage from "../pages/AttendanceSummaryPage";
import AttendanceUploadModal from "../components/attendance/AttendanceUploadModal";
import BankStatementUpload from "../pages/BankStatementUpload";


const router = createBrowserRouter([
    {
        path: '/',
        element: <App />,
        children: [
            {
                path: '',
                element: <Login />,
            },
            {
                path: '/login',
                element: <Login />,
            },
            {
                path: '/signup',
                element: <Signup />,
            },
            {
                path:'email-verification',
                element: <EmailVerification />,
            },
            {
                path:'dashboard',
                element: < Dashboard/>,
            },
            {
                path:"/catalog/:id",
                element:<CatalogView/>
            },
            {
                path:"/viewer-dashboard",
                element:<ViewerDashboard/>
            },
            {
                path:"/product-details/:id",
                element:<ViewerProductDetails/>
            },
            {
                path:"CatalogPage",
                element:<ViewersPage/>

            },
            {
                path:"forgot-password",
                element:<ForgotPassword/>
            },
            {
                path: 'admin-dashboard',
                element: <AdminDashboard />,
                children:[
                    {
                        path:'subadmin-manager',
                        element:<SubAdminManager/>
                    },
                    {
                        path:'manage-users',
                        element:<UserManagement/>
                    },
                    {
                        path:'manage-products',
                        element:<ProductUpload/>
                    },
                    {
                        path:'catalogs/manual/',
                        element:<ManageCatalogs/>
                    },
                    {
                        path:'catalogs/manual/:id',
                        element:<ManageCatalogs/>
                    },
                    {
                        path:'quotation/manual/:id',
                        element:<ManageCatalogs/>
                    },
                    {
                        path:'oldquotation/manual/:id',
                        element:<EditQuotation/>
                    },
                    {
                        path:'manage-catalogs',
                        element:<CatalogsPage/>
                    },
                    {
                        path:'catalogs/ai',
                        element:<CreateAICatalog/>
                    },{
                        path:'viewer-manager',
                        element:<ViewersManager/>
                    },
                    {
                        path:'select-products',
                        element:<SelectProductsForViewer/>
                    },
                    {
                        path:'product-details/:prodId',
                        element:<AdminProductDetails/>
                    },
                    {
                        path:'quotations/:id',
                        element:<QuotationView/>
                    },
                    {
                        path:'review-catalog',
                        element:<ReviewDashboard/>
                    },
                    {
                        path:'print-quotation/:id',
                        element:<PrintQuotation/>
                    },
                    {
                        path:'manage-jobsheets',
                        element:<ManageJobSheets/>
                    },
                    {
                        path:'manage-companies',
                        element:<ManageCompanies/>
                    },
                    {
                        path:'create-jobsheet',
                        element:<CreateJobSheet/>
                    },
                    {
                        path:'create-jobsheet/:id',
                        element:<CreateJobSheet/>
                    },
                    {
                        path:'jobsheet/:id',
                        element:<JobSheetView/>
                    },
                    {
                        path:'opportunities',
                        element:<ManageOpportunity/>
                    },
                    {
                        path:'create-opportunity',
                        element:<CreateOpportunity/>
                    },
                    {
                        path:'create-opportunity/:id',
                        element:<CreateOpportunity/>
                    },
                    {
                        path:'manage-vendors',
                        element:<ManageVendors/>
                    },
                    {
                        path:'manage-openpurchase',
                        element:<OpenPurchaseList/>
                    },
                    {
                        path:"open-purchase",
                        element:<CreateOpenPurchase/>
                    },
                    {
                        path:"open-purchase/:id",
                        element:<CreateOpenPurchase/>
                    },
                    {
                        path:'manage-closepurchase',
                        element:<ClosedPurchaseList/>
                    },
                    {
                        path:'manage-purchaseinvoice',
                        element:<ManagePurchaseInvoice/>
                    },
                    {
                        path:'create-purchaseinvoice',
                        element:<CreatePurchaseInvoice/>
                    },
                    {
                        path:'create-purchaseinvoice/:id',
                        element:<CreatePurchaseInvoice/>
                    },
                    {
                        path:'manage-productionjobsheet',
                        element:<ManageProductionJobsheet/>
                    },
                    {
                        path:"create-productionjobsheet",
                        element:<CreateProductionJobsheet/>
                    },
                    {
                        path:"create-productionjobsheet/:id",
                        element:<CreateProductionJobsheet/>
                    },
                    {
                        path:"closed-productionjobsheet",
                        element:<ClosedProductionJobsheet/>
                    },
                    {
                        path:'production-invoice',
                        element:<CreateProductionInvoice/>
                    },
                    {
                        path:'production-invoice/:id',
                        element:<CreateProductionInvoice/>
                    },
                    {
                        path:'manage-production-invoice',
                        element:<ManageProductionInvoice/>
                    },
                    {
                        path:'pending-packing',
                        element:<ManagePendingPacking/>
                    },
                    {
                        path:'closed-pending-packing',
                        element:<ManagePendingPackingClosed/>
                    },
                    {
                        path:'dispatch-scheduled',
                        element:<ManageDispatchScheduled/>
                    },
                    {
                        path:"delivery-reports" ,
                        element:<ManageDeliveryReports />
                    },
                    {
                        path:"delivery-completed",
                        element:<ManageDeliveryCompleted/>
                    },
                    {
                        path:"invoice-followup",
                        element:<InvoiceFollowUpPage/>
                    },
                    {
                        path:"invoice-summary",
                        element:<ManageInvoiceSummary/>
                    },
                    {
                        path:"payment-followup",
                        element:<ManagePaymentFollowUp/>
                    },
                    {
                        path:"manage-samples",
                        element:<Samples/>
                    },
                    {
                        path:"samples-out",
                        element:<SamplesOut/>
                    },
                    {
                        path:"sample-status",
                        element:<SampleStatus/>
                    },
                    {
                        path:"manage-expenses",
                        element:<ManageExpenses/>
                    },
                    {
                        path:"manage-potential-clients",
                        element:<ManagePotentialClients/>
                    },
                    {
                        path:"manage-events",
                        element:<EventManager/>
                    },
                    {
                        path:"events-calender",
                        element: <CalendarPage/>
                    },
                    {
                        path:"home",
                        element:<Home/>
                    },
                    {
                        path: "manage-segments",
                        element : <ManageSegments/>
                    },
                    {
                        path: "manage-branding-charges",
                        element : <ManageBrandingCharges/>
                    },
                    {
                        path: "manage-quotations",
                        element : <QuotationManagementPage/>
                    },
                    {
                        path: "logs",
                        element : <LogsTable/>
                    },
                    {
                        path : "manage-tasks",
                        element:<TaskManager/>
                    },
                    {
                        path : "manage-dc",
                        element:<DeliveryChallanManagementPage/>
                    },
                    {
                        path : "dc/:id",
                        element : <DeliveryChallan/>
                    },
                    {
                        path : "manage-tickets",
                        element : <ManageTicketsPage/>
                    },
                    {
                        path : "e-invoice",
                        element : <EInvoiceTable/>
                    },
                    {
                        path : "manage-invoices",
                        element : <ManageInvoices/>
                    },
                    {
                        path : "invoices/:id/edit",
                        element:<InvoiceEditPage/>
                    },
                    {
                        path : "invoices/:id/print",
                        element:<InvoicePrint/>
                    },
                    {
                        path : "hrms/employees",
                        element:<EmployeesPage/>
                    },
                    {
                        path : "hrms/employees/:employeeId",
                        element:<EmployeeDetailPage/>
                    },
                    {
                        path : "hrms/attendance",
                        element:<AttendancePage/>
                    },
                    {
                        path : "hrms/wfh",
                        element:<WfhPage/>
                    },
                    {
                        path : "hrms/leaves",
                        element:<LeavesPage/>
                    },
                    {
                        path : "hrms/salary",
                        element:<SalaryPage/>
                    },
                    {
                        path: "purchase-orders",
                        element:<PurchaseOrdersList/>
                    },
                    {
                        path: "holidays",
                        element:<HolidaysPage/>
                    },
                    {
                        path: "my-profile",
                        element:<MyProfile/>
                    },
                    {
                        path: "leaves-super-admin",
                        element:<LeavesSuperAdminPage/>
                    },
                    {
                        path: "file-management",
                        element:<FileManagement/>
                    },
                    {
                        path: "attendance-summary",
                        element:<AttendanceSummaryPage/>
                    },
                    {
                        path:"attendance/upload",
                        element:<AttendanceUploadModal/>
                    },
                    {
                        path:"bank-statement",
                        element:<BankStatementUpload/>
                    }
                ]
            }
        ],
    },
]);

export default router;
