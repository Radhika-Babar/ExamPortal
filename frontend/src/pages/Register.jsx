import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/auth.context";
import { registerUser } from "../api/auth.api";

const Register = () => {
  const { user, login } = useAuth();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "student",
    rollNo: "",
    department: "",
    semester: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Redirect if already logged in
  if (user) {
    return (
      <Navigate
        to={
          user.role === "student"
            ? "/student/dashboard"
            : "/faculty/dashboard"
        }
        replace
      />
    );
  }

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // ✅ CLEAN PAYLOAD (no undefined)
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
      };

      if (form.department) {
        payload.department = form.department.trim();
      }

      if (form.role === "student") {
        if (!form.rollNo || !form.semester) {
          throw new Error("Roll No and Semester are required");
        }

        payload.rollNo = form.rollNo.trim();
        payload.semester = Number(form.semester);
      }

      const res = await registerUser(payload);

      const data = res?.data?.data;

      if (!data) throw new Error("Invalid server response");

      // login after register
      login(data.user, data.accessToken, data.refreshToken);

    } catch (err) {
  console.log("FULL ERROR:", err);

  if (err.response) {
    console.log("DATA:", err.response.data);
    console.log("STATUS:", err.response.status);
  }

  let msg = "Registration failed";

  if (err.response?.data?.errors) {
    // 🔥 extract all validation messages
    msg = err.response.data.errors
      .map((e) => e.message || e.msg)
      .join(", ");
  } else {
    msg =
      err.response?.data?.message ||
      err.response?.data?.error ||
      err.message;
  }

  setError(msg);
}
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white p-6 rounded-xl shadow">
        <h2 className="text-xl font-bold text-center mb-4">
          Create Account
        </h2>

        {error && (
          <div className="bg-red-100 text-red-600 p-2 mb-3 rounded text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">

          {/* ROLE */}
          <select
            name="role"
            value={form.role}
            onChange={handleChange}
            className="input"
          >
            <option value="student">Student</option>
            <option value="faculty">Faculty</option>
          </select>

          {/* NAME */}
          <input
            type="text"
            name="name"
            placeholder="Full Name"
            value={form.name}
            onChange={handleChange}
            className="input"
            required
          />

          {/* EMAIL */}
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            className="input"
            required
          />

          {/* PASSWORD */}
          <input
            type="password"
            name="password"
            placeholder="Password (min 6 chars)"
            value={form.password}
            onChange={handleChange}
            className="input"
            required
          />

          {/* DEPARTMENT */}
          <input
            type="text"
            name="department"
            placeholder="Department"
            value={form.department}
            onChange={handleChange}
            className="input"
          />

          {/* STUDENT FIELDS */}
          {form.role === "student" && (
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                name="rollNo"
                placeholder="Roll No"
                value={form.rollNo}
                onChange={handleChange}
                className="input"
              />

              <select
                name="semester"
                value={form.semester}
                onChange={handleChange}
                className="input"
              >
                <option value="">Semester</option>
                {[1,2,3,4,5,6,7,8].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* SUBMIT */}
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white py-2 rounded"
          >
            {loading ? "Creating..." : "Create Account"}
          </button>
        </form>

        <p className="text-center text-sm mt-4">
          Already have an account?{" "}
          <Link to="/login" className="text-blue-600">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;