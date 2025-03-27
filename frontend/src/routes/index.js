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
                    }

                    
                ]
            }
        ],
    },
]);

export default router;
