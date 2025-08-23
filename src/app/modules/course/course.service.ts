import axios from "axios";
import ApiError from "../../errors/ApiError";

const getRecommendedCoursesFromAI = async (userId: string) => {
  if (!userId) {
    throw new ApiError(400, "User ID is required to get recommended courses.");
  }

  const result = await axios.post(
    `http://31.97.216.98:8000/api/v1/course-recommendations/regenerate/${userId}`,
    {
      userId,
    }
  );

  console.log("result", result.data);

  return result.data;
};

const getAllCoursesFromAI = async () => {
  const result = await axios.get(
    `http://31.97.216.98:8000/api/v1/courses/api/courses/all`
  );

  return result.data;
};

export const CourseService = {
  getAllCoursesFromAI,
  getRecommendedCoursesFromAI,
};
