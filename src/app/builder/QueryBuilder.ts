class QueryBuilder {
  where(whereCondition: any) {
    throw new Error("Method not implemented.");
  }
  private model: any;
  private query: Record<string, unknown>;
  private prismaQuery: any = {}; // Define as any for flexibility

  constructor(model: any, query: Record<string, unknown>) {
    this.model = model; // Prisma model instance
    this.query = query; // Query params
  }
  // Search
  search(searchableFields: string[]) {
    const searchTerm = this.query.searchTerm as string;
    if (searchTerm) {
      const enumFields = new Set([
        "jobType",
        "status",
        "salaryType",
        "role",
        "isVerified",
        "isSubscribed",
        "subscriptionType",
        "userStatus",
        "planType",
        "interval",
        "paymentStatus",
        "userRole",
        "profileStatus",
        "jobPostStatus",
        "applicationStatus",
        "interviewPlatform",
        "chatRoomType",
        "participantRole",
        "chatMessageType",
        "preferredContactMethod",
      ]);

      const rangeFields = new Set(["experience"]);

      const buildNestedContains = (path: string) => {
        const keys = path.split(".");
        const lastKey = keys.pop() as string;
        let condition: Record<string, any> = {};
        let current = condition;

        for (const key of keys) {
          current[key] = {};
          current = current[key];
        }

        // Check if the field is an enum field
        if (enumFields.has(lastKey)) {
          current[lastKey] = searchTerm; // Use exact match for enum fields
        } else if (rangeFields.has(lastKey)) {
          current[lastKey] = { contains: searchTerm, mode: "insensitive" }; // Use contains for range fields
        } else {
          current[lastKey] = { contains: searchTerm, mode: "insensitive" };
        }
        return condition;
      };

      const orConditions = searchableFields.map((field) => {
        if (field.includes(".")) {
          return buildNestedContains(field);
        } else {
          // Check if the field is an enum field
          if (enumFields.has(field)) {
            return { [field]: searchTerm }; // Use exact match for enum fields
          } else if (rangeFields.has(field)) {
            return { [field]: { contains: searchTerm, mode: "insensitive" } }; // Use contains for range fields
          } else if (field === "title") {
            // Special handling for title field in search - support multiple titles
            if (searchTerm.includes(",")) {
              const titles = searchTerm
                .split(",")
                .map((t) => t.trim())
                .filter((t) => t.length > 0);
              return {
                OR: titles.map((title) => ({
                  title: { contains: title, mode: "insensitive" },
                })),
              };
            } else {
              return { [field]: { contains: searchTerm, mode: "insensitive" } };
            }
          } else if (field === "jobType") {
            // Special handling for jobType field in search - support multiple job types
            if (searchTerm.includes(",")) {
              const jobTypes = searchTerm
                .split(",")
                .map((type) => type.trim())
                .filter((type) => type.length > 0);
              return {
                OR: jobTypes.map((jobType) => ({
                  jobType: jobType,
                })),
              };
            } else {
              return { [field]: searchTerm }; // Use exact match for single job type
            }
          } else if (field === "skills") {
            // Special handling for skills field - search in array
            if (searchTerm.includes(",")) {
              const skills = searchTerm
                .split(",")
                .map((skill) => skill.trim())
                .filter((skill) => skill.length > 0);
              return {
                OR: skills.map((skill) => ({
                  skills: { has: skill },
                })),
              };
            } else {
              return { skills: { has: searchTerm } };
            }
          } else {
            return { [field]: { contains: searchTerm, mode: "insensitive" } };
          }
        }
      });

      // Merge with any existing OR conditions
      const existingWhere = this.prismaQuery.where || {};
      const existingOr: any[] = existingWhere.OR || [];

      this.prismaQuery.where = {
        ...existingWhere,
        OR: [...existingOr, ...orConditions],
      };
    }
    return this;
  }

  filter() {
    const queryObj = { ...this.query };
    const excludeFields = ["searchTerm", "sort", "limit", "page", "fields"];
    excludeFields.forEach((field) => delete queryObj[field]);

    const formattedFilters: Record<string, any> = {};
    const containsFields = new Set([
      "title",
      "location",
      "salaryRange",
      "company.companyName",
    ]);

    const rangeFields = new Set(["experience"]);

    const enumFields = new Set([
      "jobType",
      "status",
      "salaryType",
      "role",
      "isVerified",
      "isSubscribed",
      "subscriptionType",
      "userStatus",
      "planType",
      "interval",
      "paymentStatus",
      "userRole",
      "profileStatus",
      "jobPostStatus",
      "applicationStatus",
      "interviewPlatform",
      "chatRoomType",
      "participantRole",
      "chatMessageType",
      "preferredContactMethod",
    ]);

    const orConditions: any[] = [];

    const buildNestedContains = (path: string, value: string) => {
      const keys = path.split(".");
      const lastKey = keys.pop() as string;
      const condition: Record<string, any> = {};
      let current = condition;
      for (const key of keys) {
        current[key] = {};
        current = current[key];
      }
      current[lastKey] = { contains: value, mode: "insensitive" };
      return condition;
    };

    for (const [key, value] of Object.entries(queryObj)) {
      // Special handling for experience field
      if (key === "experience" && typeof value === "string") {
        const experienceValue = value as string;

        // Check if it's a range format like "1 year to 5 years" or "1-5 years" or "1 years-5 years"
        const rangePattern =
          /(\d+)\s*(?:year|years)?\s*(?:to|-)\s*(\d+)\s*(?:year|years)?/i;
        const match = experienceValue.match(rangePattern);

        if (match) {
          // It's a range query, store the range for later processing
          const minYears = parseInt(match[1]);
          const maxYears = parseInt(match[2]);

          // Store range info in the query object for service layer processing
          if (!this.query._experienceRange) {
            (this.query as any)._experienceRange = {
              min: minYears,
              max: maxYears,
            };
          }

          // For now, get all jobs and filter in service layer
          // Don't add any OR conditions for range queries
        } else {
          // For single value, use contains search
          orConditions.push({
            [key]: { contains: experienceValue, mode: "insensitive" },
          });
        }
      }
      // Special handling for title field - support multiple titles
      else if (key === "title" && typeof value === "string") {
        const titleValue = value as string;

        // Check if it's a comma-separated list of titles
        if (titleValue.includes(",")) {
          const titles = titleValue
            .split(",")
            .map((t) => t.trim())
            .filter((t) => t.length > 0);

          // Create OR conditions for each title
          const titleConditions = titles.map((title) => ({
            title: { contains: title, mode: "insensitive" },
          }));

          orConditions.push(...titleConditions);
        } else {
          // Single title search
          orConditions.push({
            [key]: { contains: titleValue, mode: "insensitive" },
          });
        }
      }
      // Special handling for location field - support multiple locations
      else if (key === "location" && typeof value === "string") {
        const locationValue = value as string;

        // Check if it's a comma-separated list of locations
        if (locationValue.includes(",")) {
          const locations = locationValue
            .split(",")
            .map((loc) => loc.trim())
            .filter((loc) => loc.length > 0);

          // Create OR conditions for each location
          const locationConditions = locations.map((location) => ({
            location: { contains: location, mode: "insensitive" },
          }));

          orConditions.push(...locationConditions);
        } else {
          // Single location search
          orConditions.push({
            [key]: { contains: locationValue, mode: "insensitive" },
          });
        }
      }
      // Special handling for jobType field - support multiple job types
      else if (key === "jobType" && typeof value === "string") {
        const jobTypeValue = value as string;

        // Check if it's a comma-separated list of job types
        if (jobTypeValue.includes(",")) {
          const jobTypes = jobTypeValue
            .split(",")
            .map((type) => type.trim())
            .filter((type) => type.length > 0);

          // Create OR conditions for each job type
          const jobTypeConditions = jobTypes.map((jobType) => ({
            jobType: jobType,
          }));

          orConditions.push(...jobTypeConditions);
        } else {
          // Single job type search
          formattedFilters[key] = jobTypeValue;
        }
      }
      // Special handling for companyName (common case)
      else if (key === "companyName") {
        if (typeof value === "string") {
          orConditions.push(buildNestedContains("company.companyName", value));
        } else {
          if (!formattedFilters.company) {
            formattedFilters.company = {};
          }
          formattedFilters.company.companyName = value;
        }
      }
      // Handle nested fields (e.g., company.companyName)
      else if (key.includes(".")) {
        const [relation, field] = key.split(".");
        if (!formattedFilters[relation]) {
          formattedFilters[relation] = {};
        }
        const fullKey = `${relation}.${field}`;
        if (typeof value === "string" && containsFields.has(fullKey)) {
          orConditions.push(buildNestedContains(fullKey, value));
        } else if (typeof value === "string" && enumFields.has(field)) {
          // For enum fields in nested relations, use equals
          formattedFilters[relation][field] = value;
        } else {
          formattedFilters[relation][field] = value;
        }
      }
      // Handle direct fields with operators (e.g., field[gt])
      else if (typeof value === "string" && value.includes("[")) {
        const [field, operator] = key.split("[");
        const op = operator.slice(0, -1); // Remove the closing ']'
        formattedFilters[field] = { [`${op}`]: parseFloat(value as string) };
      }
      // Handle direct fields
      else {
        if (typeof value === "string" && containsFields.has(key)) {
          orConditions.push({
            [key]: { contains: value, mode: "insensitive" },
          });
        } else if (typeof value === "string" && enumFields.has(key)) {
          // For enum fields, use equals instead of contains
          formattedFilters[key] = value;
        } else {
          formattedFilters[key] = value;
        }
      }
    }

    const mergedWhere: any = {
      ...(this.prismaQuery.where || {}),
      ...formattedFilters,
    };
    if (orConditions.length > 0) {
      const existingOr: any[] = mergedWhere.OR || [];
      mergedWhere.OR = [...existingOr, ...orConditions];
    }

    this.prismaQuery.where = mergedWhere;

    return this;
  }

  //raw filter
  rawFilter(filters: Record<string, any>) {
    // Ensure that the filters are merged correctly with the existing where conditions
    // Preserve OR conditions when merging
    const existingOr = this.prismaQuery.where?.OR || [];

    this.prismaQuery.where = {
      ...this.prismaQuery.where,
      ...filters,
    };

    // Restore OR conditions if they exist
    if (existingOr.length > 0) {
      this.prismaQuery.where.OR = existingOr;
    }

    return this;
  }

  // Sorting
  sort() {
    const sort = (this.query.sort as string)?.split(",") || ["-createdAt"];
    const orderBy = sort.map((field) => {
      if (field.startsWith("-")) {
        return { [field.slice(1)]: "desc" };
      }
      return { [field]: "asc" };
    });

    this.prismaQuery.orderBy = orderBy;
    return this;
  }

  // Pagination
  paginate() {
    const page = Number(this.query.page) || 1;
    const limit = Number(this.query.limit) || 10;
    const skip = (page - 1) * limit;

    this.prismaQuery.skip = skip;
    this.prismaQuery.take = limit;

    return this;
  }

  // Fields Selection
  fields() {
    const fields = (this.query.fields as string)?.split(",") || [];
    if (fields.length > 0) {
      this.prismaQuery.select = fields.reduce(
        (acc: Record<string, boolean>, field) => {
          acc[field] = true;
          return acc;
        },
        {}
      );
    }
    return this;
  }

  select(fields: string[]) {
    this.prismaQuery.select = fields.reduce(
      (acc: Record<string, boolean>, field) => {
        acc[field] = true;
        return acc;
      },
      {}
    );
    return this;
  }

  // **Include Related Models*/
  include(inculpableFields: Record<string, boolean | object>) {
    this.prismaQuery.include = {
      ...this.prismaQuery.include,
      ...inculpableFields,
    };
    return this;
  }

  // **Execute Query*/
  async execute() {
    return this.model.findMany(this.prismaQuery);
  }

  // Count Total
  async countTotal() {
    const total = await this.model.count({ where: this.prismaQuery.where });
    const page = Number(this.query.page) || 1;
    const limit = Number(this.query.limit) || 10;
    const totalPage = Math.ceil(total / limit);

    return {
      page,
      limit,
      total,
      totalPage,
    };
  }

  priceRange(minPrice?: number, maxPrice?: number) {
    if (!this.prismaQuery.where) {
      this.prismaQuery.where = {};
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      this.prismaQuery.where.price = {};

      if (minPrice !== undefined) {
        this.prismaQuery.where.price.gte = minPrice;
      }

      if (maxPrice !== undefined) {
        this.prismaQuery.where.price.lte = maxPrice;
      }
    }

    return this;
  }

  experienceRange(minExperience?: number, maxExperience?: number) {
    if (!this.prismaQuery.where) {
      this.prismaQuery.where = {};
    }

    // NOTE: If experience is stored as a string, you may need to convert or adjust this logic.
    if (minExperience !== undefined || maxExperience !== undefined) {
      this.prismaQuery.where.experience = {};

      if (minExperience !== undefined) {
        this.prismaQuery.where.experience.gte = minExperience;
      }

      if (maxExperience !== undefined) {
        this.prismaQuery.where.experience.lte = maxExperience;
      }
    }

    return this;
  }
}

export default QueryBuilder;
