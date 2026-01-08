import { Routes, Route } from "react-router-dom";
import "./assets/styles/App.css";
import MainLayout from "./MainLayout";
import Home from "./app/Home";
import About from "./app/About";

function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        {/* Add more pages here */}
      </Route>
    </Routes>
  );
}

export default App;
