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
                    
                ]
            }
        ],
    },
]);

export default router;
