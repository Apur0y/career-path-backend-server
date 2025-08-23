import config from "../../config";
import catchAsync from "../../utils/catchAsync";
import { CompanyService } from "./company.service";
import sendResponse from "../../utils/sendResponse";

const createCompany = catchAsync(async (req, res) => {
  if (req.file) {
    req.body.logo = `${config.imageUrl}/uploads/${req.file.filename}`;
  }

  const userId = req.user.id;

  const result = await CompanyService.createCompanyIntoDB(userId, req.body);

  sendResponse(res, {
    statusCode: 201,
    message: "Company created successfully!",
    data: result,
  });
});

const getAllCompanies = catchAsync(async (req, res) => {
  const result = await CompanyService.getAllCompaniesFromDB(req.query);

  sendResponse(res, {
    statusCode: 200,
    message: "Companies retrieved successfully!",
    meta: result.meta,
    data: result.data,
  });
});

const getSingleCompany = catchAsync(async (req, res) => {
  const { companyId } = req.params;
  const result = await CompanyService.getSingleCompanyByIdFromDB(companyId);

  sendResponse(res, {
    statusCode: 200,
    message: "Company retrieved successfully!",
    data: result,
  });
});

const getMyCompany = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const result = await CompanyService.getMyCompanyFromDB(userId);

  sendResponse(res, {
    statusCode: 200,
    message: "Company retrieved successfully!",
    data: result,
  });
});

const updateCompany = catchAsync(async (req, res) => {
  const userId = req.user.id;

  if (req.file) {
    req.body.logo = `${config.imageUrl}/uploads/${req.file.filename}`;
  }

  const result = await CompanyService.updateCompanyInToDB(userId, req.body);

  sendResponse(res, {
    statusCode: 200,
    message: "Company updated successfully!",
    data: result,
  });
});

const getAllCompaniesName = catchAsync(async (req, res) => {
  const result = await CompanyService.getAllCompaniesNameFromDB();

  sendResponse(res, {
    statusCode: 200,
    message: "Company names retrieved successfully!",
    data: result,
  });
});

export const CompanyController = {
  getMyCompany,
  createCompany,
  updateCompany,
  getAllCompanies,
  getSingleCompany,
  getAllCompaniesName,
};
