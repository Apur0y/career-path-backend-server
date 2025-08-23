import catchAsync from "../../utils/catchAsync";
import { CourseService } from "./course.service";
import sendResponse from "../../utils/sendResponse";

const getRecommendedCourses = catchAsync(async (req, res) => {
  const userId = req.params.userId;
  const courses = await CourseService.getRecommendedCoursesFromAI(userId);

  sendResponse(res, {
    statusCode: 200,
    message: "Recommended courses retrieved successfully!",
    data: courses,
  });
});

const getAllCourses = catchAsync(async (req, res) => {
  const courses = await CourseService.getAllCoursesFromAI();

  sendResponse(res, {
    statusCode: 200,
    message: "All Recommended courses retrieved successfully!",
    data: courses,
  });
});

export const CourseController = {
  getAllCourses,
  getRecommendedCourses,
};
