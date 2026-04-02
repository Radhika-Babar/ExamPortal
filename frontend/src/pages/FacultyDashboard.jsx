import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { getExams, publishExam, deleteExam } from "../api/exam.api";
import toast from "react-hot-toast";

const FacultyDashboard = () => {
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchExams = async () => {
    try {
      const res = await getExams();
      setExams(res.data.data);
    } catch (err) {
      toast.err("Failed to load exams");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  const handlePublish = async (examId) => {
    try {
      const res = await publishExam(examId);
      const { isPublished } = res.data.data;
      setExams((prev) =>
        prev.map((e) => (e._id === examId ? { ...e, isPublished } : e)),
      );
      toast.success(isPublished ? "Exam published" : "Exam unpublished");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to toggle publish");
    }
  };

  const handleDelete = async (examId, title) => {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    try {
      await deleteExam(examId);
      setExams((prev) => prev.filter((e) => e._id !== examId));
      toast.success("Exam deleted");
    } catch (err) {
      toast.error(err.response?.data?.message || "Cannot delete this exam");
    }
  };

  const formatDate = (d) =>
    new Date(d).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  if (loading)
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header row */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold text-gray-900">My exams</h1>
          <button
            onClick={() => navigate("/faculty/create-exam")}
            className="btn-primary"
          >
            + Create exam
          </button>
        </div>

        {/* Exams list */}
        {exams.length === 0 ? (
          <div className="card text-center py-16">
            <p className="text-gray-400 mb-4">No exams yet.</p>
            <button
              onClick={() => navigate("/faculty/create-exam")}
              className="btn-primary"
            >
              Create your first exam
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {exams.map((exam) => (
              <div key={exam._id} className="card">
                <div className="flex items-start justify-between gap-4">
                  {/* Exam info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-semibold text-gray-900">
                        {exam.title}
                      </h3>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium
                        ${
                          exam.isPublished
                            ? "bg-green-50 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {exam.isPublished ? "Published" : "Draft"}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                      <span>{exam.subject}</span>
                      <span>{exam.durationMinutes} min</span>
                      <span>{exam.totalMarks} marks</span>
                      <span>{exam.attemptCount ?? 0} attempts</span>
                    </div>

                    <div className="text-xs text-gray-400 mt-1.5">
                      {formatDate(exam.startTime)} → {formatDate(exam.endTime)}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                    {/* Results — only if someone attempted */}
                    {(exam.attemptCount ?? 0) > 0 && (
                      <button
                        onClick={() =>
                          navigate(`/faculty/exam/${exam._id}/results`)
                        }
                        className="btn-secondary text-xs px-3 py-2"
                      >
                        Results
                      </button>
                    )}

                    {/* Publish toggle */}
                    <button
                      onClick={() => handlePublish(exam._id)}
                      className={`text-xs px-3 py-2 rounded-lg border font-medium transition-all
                        ${
                          exam.isPublished
                            ? "border-gray-300 text-gray-600 hover:bg-gray-50"
                            : "border-primary-500 text-primary-600 hover:bg-primary-50"
                        }`}
                    >
                      {exam.isPublished ? "Unpublish" : "Publish"}
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(exam._id, exam.title)}
                      className="text-xs px-3 py-2 rounded-lg border border-red-200
                        text-red-500 hover:bg-red-50 transition-all"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FacultyDashboard;
