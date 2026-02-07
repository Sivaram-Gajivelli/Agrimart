import { Routes, Route } from "react-router-dom";
import "./assets/styles/App.css";
import MainLayout from "./MainLayout";
import Home from "./app/Home";
import About from "./app/About";
import Login from "./auth/Login";
import Signup from "./auth/Signup";
import RoleSelect from "./auth/RoleSelect";
import Dashboard from "./app/Dashboard";

function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/dashboard" element={<Dashboard/>}/>
        {/* Add more pages here */}
      </Route>

      
      <Route path="/auth" element={<RoleSelect />} />
      <Route path="/login/:role" element={<Login />} />
      <Route path="/signup/:role" element={<Signup />} />
    </Routes>
  );
}

export default App;
