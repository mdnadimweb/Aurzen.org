import '../admin.css';
// Admin styles load only on /admin pages, so shoppers never download them.
export default function AdminLayout({children}:{children:React.ReactNode}){return children;}
