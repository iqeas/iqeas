// import pool from "../config/db.js";

// /**
//  * Fetches files based on project, current user, role, and file direction.
//  *
//  * @param {number} project_id - The ID of the project.
//  * @param {number} current_user_id - The ID of the currently logged-in user.
//  * @param {string} role - The role of the current user (e.g., 'admin', 'rfq', 'estimation', 'pm', 'working', 'documentation').
//  * @param {string} [type='all'] - The type of files to fetch: 'incoming', 'outgoing', or 'all'. Defaults to 'all'.
//  * @returns {Promise<Array>} A promise that resolves to an array of file objects.
//  * @throws {Error} Throws an error if the type parameter is invalid or the role is unauthorized.
//  */
// export async function getFilesByType(
//   project_id,
//   current_user_id,
//   role,
//   type = "all"
// ) {
//   try {
//     const validTypes = ["incoming", "outgoing", "all"];
//     if (!validTypes.includes(type)) {
//       throw new Error(
//         "Invalid type parameter; must be 'incoming', 'outgoing', or 'all'."
//       );
//     }

//     // Ensure IDs are numbers to avoid type coercion issues in SQL parameters
//     const numericProjectId = Number(project_id);
//     const numericCurrentUserId = Number(current_user_id);

//     let query = "";
//     let queryParams = [];

//     // Common SELECT clause (direction determined by current_user_id vs uf.uploaded_by_id)
//     // $1 in this clause will always refer to the current_user_id for direction determination
//     const selectClauseBase = `
//       SELECT
//           uf.*,
//           u.name AS uploaded_by_name,
//           CASE
//               WHEN uf.uploaded_by_id = $1 THEN 'outgoing'
//               ELSE 'incoming'
//           END AS direction
//     `;
//     // Join users table universally as it's needed for uploaded_by_name and role checks
//     const fromAndJoinUsers = `
//       FROM uploaded_files uf
//       JOIN users u ON u.id = uf.uploaded_by_id
//     `;
//     const orderByClause = ` ORDER BY uf.created_at DESC`;

//     // Case for admin, documentation, working, and PM (all linked via projects_uploaded_files)
//     if (["admin", "documentation", "working", "pm"].includes(role)) {
//       // Common parameters: $1 for current_user_id (for CASE), $2 for project_id
//       queryParams = [numericCurrentUserId, numericProjectId];
//       let whereConditions = [`puf.project_id = $2`];

//       // Add user-specific direction filtering based on 'type'
//       if (type === "outgoing") {
//         whereConditions.push(`uf.uploaded_by_id = $1`);
//       } else if (type === "incoming") {
//         whereConditions.push(`uf.uploaded_by_id != $1`);

//         // Add role-specific incoming filters only if 'incoming' is requested
//         if (role === "documentation" || role === "working") {
//           whereConditions.push(`u.role = 'pm'`);
//         } else if (role === "pm") {
//           whereConditions.push(
//             `u.role IN ('estimation', 'working', 'documentation')`
//           );
//         }
//       } else {
//         // type === "all"
//         // For 'all', we need files uploaded by the current user OR files not uploaded by the current user that meet specific incoming role criteria.
//         let combinedDirectionConditions = [];
//         combinedDirectionConditions.push(`uf.uploaded_by_id = $1`); // Always include current user's uploads (outgoing)

//         let incomingRoleConditions = [];
//         if (role === "documentation" || role === "working") {
//           incomingRoleConditions.push(`u.role = 'pm'`);
//         } else if (role === "pm") {
//           incomingRoleConditions.push(
//             `u.role IN ('estimation', 'working', 'documentation')`
//           );
//         }

//         // Only add 'incoming' part if there are specific incoming roles, otherwise, just 'not uploaded by current user'
//         if (incomingRoleConditions.length > 0) {
//           combinedDirectionConditions.push(
//             `(uf.uploaded_by_id != $1 AND (${incomingRoleConditions.join(
//               " OR "
//             )}))`
//           );
//         } else {
//           // For admin, if no specific incoming roles are defined, 'incoming' simply means not uploaded by current user.
//           combinedDirectionConditions.push(`uf.uploaded_by_id != $1`);
//         }
//         whereConditions.push(`(${combinedDirectionConditions.join(" OR ")})`);
//       }

//       query = `
//         ${selectClauseBase}
//         ${fromAndJoinUsers}
//         JOIN projects_uploaded_files puf ON uf.id = puf.uploaded_file_id
//         WHERE ${whereConditions.join(" AND ")}
//         ${orderByClause}
//       `;
//     }
//     // RFQ users -> can only see their own (outgoing) uploads. No 'incoming' files.
//     else if (role === "rfq") {
//       if (type === "incoming") {
//         return []; // No incoming files for RFQ role as per logic.
//       }
//       // If 'type' is 'outgoing' or 'all', RFQ users only see their own uploads, explicitly filtered.
//       query = `
//         ${selectClauseBase}
//         ${fromAndJoinUsers}
//         JOIN projects_uploaded_files puf ON uf.id = puf.uploaded_file_id
//         WHERE puf.project_id = $2 AND uf.uploaded_by_id = $1
//         ${orderByClause}
//       `;
//       queryParams = [numericCurrentUserId, numericProjectId];
//     }
//     // Estimation -> files linked via estimation_uploaded_files (outgoing by current user) and incoming from RFQ.
//     else if (role === "estimation") {
//       // Fetch estimation_id first, as it's crucial for outgoing estimation files.
//       const estRes = await pool.query(
//         `SELECT id FROM estimations WHERE project_id = $1`,
//         [numericProjectId]
//       );

//       let estimation_id = null;
//       if (estRes.rowCount > 0) {
//         estimation_id = Number(estRes.rows[0].id);
//       }

//       let conditions = [];
//       let dynamicParams = [];
//       let paramIndex = 1; // Parameters for the main query and EXISTS clauses start from $1

//       // The first parameter in dynamicParams (which is $1 in the query) is for the CASE statement
//       const paramForCase = `$${paramIndex++}`; // This will be $1
//       dynamicParams.push(numericCurrentUserId);

//       // Conditionally add outgoing files for estimation
//       if (type === "outgoing" || type === "all") {
//         if (estimation_id) {
//           // Only if an estimation exists
//           const estIdParam = `$${paramIndex++}`; // $2
//           const currentUserIdForEstParam = `$${paramIndex++}`; // $3
//           conditions.push(`
//                     EXISTS (
//                         SELECT 1 FROM estimation_uploaded_files euf
//                         WHERE euf.uploaded_file_id = uf.id
//                         AND euf.estimation_id = ${estIdParam}
//                         AND uf.uploaded_by_id = ${currentUserIdForEstParam}
//                     )
//                 `);
//           dynamicParams.push(estimation_id);
//           dynamicParams.push(numericCurrentUserId);
//         }
//       }

//       // Conditionally add incoming (RFQ) files for estimation
//       if (type === "incoming" || type === "all") {
//         const projectIdForRfqParam = `$${paramIndex++}`; // This will be $2 (if outgoing skipped) or $4
//         conditions.push(`
//                 EXISTS (
//                     SELECT 1 FROM projects_uploaded_files puf
//                     WHERE puf.uploaded_file_id = uf.id
//                     AND puf.project_id = ${projectIdForRfqParam}
//                     AND u.role = 'rfq'
//                 )
//             `);
//         dynamicParams.push(numericProjectId);
//       }

//       if (conditions.length === 0) {
//         return []; // No conditions met, return empty.
//       }

//       query = `
//             ${selectClauseBase.replace("$1", paramForCase)}
//             ${fromAndJoinUsers}
//             WHERE (${conditions.join(" OR ")})
//             ${orderByClause}
//         `;
//       queryParams = dynamicParams; // The final parameters array
//     } else {
//       throw new Error("Invalid role");
//     }

//     if (!query) {
//       return []; // Return empty if no query was constructed.
//     }

//     // --- IMPORTANT DEBUGGING STEP ---
//     // Log the generated SQL query and its parameters BEFORE execution.
//     // This is the most crucial step for you to debug by running the query directly in your DB client.
//     console.log("Generated SQL Query:", query);
//     console.log("Query Parameters:", queryParams);
//     // --- END DEBUGGING STEP ---

//     const { rows } = await pool.query(query, queryParams);
//     return rows;
//   } catch (err) {
//     console.error("Error in getFilesByType:", err);
//     throw err;
//   }
// }
import pool from "../config/db.js";

export async function getFilesByType(
  project_id,
  current_user_id,
  role,
  type = "all"
) {
  try {
    console.log("Received parameters:", {
      project_id,
      current_user_id,
      role,
      type,
    });

    const validTypes = ["incoming", "outgoing", "all"];
    const normalizedType = type.toLowerCase();
    if (!validTypes.includes(normalizedType)) {
      throw new Error(
        "Invalid type parameter; must be 'incoming', 'outgoing', or 'all'."
      );
    }

    const numericProjectId = Number(project_id);
    const numericCurrentUserId = Number(current_user_id);

    let query = "";
    let queryParams = [];

    const selectClauseBase = `
      SELECT
          uf.*,
          u.name AS uploaded_by_name,
          CASE
              WHEN uf.uploaded_by_id = $1 THEN 'outgoing'
              ELSE 'incoming'
          END AS direction
    `;
    const fromAndJoinUsers = `
      FROM uploaded_files uf
      JOIN users u ON u.id = uf.uploaded_by_id
    `;
    const orderByClause = ` ORDER BY uf.created_at DESC`;

    if (["admin", "documentation", "working", "pm"].includes(role)) {
      queryParams = [numericCurrentUserId, numericProjectId];
      let whereConditions = [`puf.project_id = $2`];

      if (normalizedType === "outgoing") {
        whereConditions.push(`uf.uploaded_by_id = $1`);
      } else if (normalizedType === "incoming") {
        whereConditions.push(`uf.uploaded_by_id != $1`);
        if (role === "documentation" || role === "working") {
          whereConditions.push(`u.role = 'pm'`);
        } else if (role === "pm") {
          whereConditions.push(
            `u.role IN ('estimation', 'working', 'documentation')`
          );
        }
      } else {
        let combinedDirectionConditions = [];
        combinedDirectionConditions.push(`uf.uploaded_by_id = $1`);
        let incomingRoleConditions = [];
        if (role === "documentation" || role === "working") {
          incomingRoleConditions.push(`u.role = 'pm'`);
        } else if (role === "pm") {
          incomingRoleConditions.push(
            `u.role IN ('estimation', 'working', 'documentation')`
          );
        }
        if (incomingRoleConditions.length > 0) {
          combinedDirectionConditions.push(
            `(uf.uploaded_by_id != $1 AND (${incomingRoleConditions.join(
              " OR "
            )}))`
          );
        } else {
          combinedDirectionConditions.push(`uf.uploaded_by_id != $1`);
        }
        whereConditions.push(`(${combinedDirectionConditions.join(" OR ")})`);
      }

      query = `
        ${selectClauseBase}
        ${fromAndJoinUsers}
        JOIN projects_uploaded_files puf ON uf.id = puf.uploaded_file_id
        WHERE ${whereConditions.join(" AND ")}
        ${orderByClause}
      `;
    } else if (role === "rfq") {
      if (normalizedType === "incoming") {
        console.log("No incoming files for RFQ role");
        return [];
      }
      query = `
        ${selectClauseBase}
        ${fromAndJoinUsers}
        JOIN projects_uploaded_files puf ON uf.id = puf.uploaded_file_id
        WHERE puf.project_id = $2 AND uf.uploaded_by_id = $1
        ${orderByClause}
      `;
      queryParams = [numericCurrentUserId, numericProjectId];
    } else if (role === "estimation") {
      const estRes = await pool.query(
        `SELECT id FROM estimations WHERE project_id = $1`,
        [numericProjectId]
      );

      let estimation_id = null;
      if (estRes.rowCount > 0) {
        estimation_id = Number(estRes.rows[0].id);
      }

      if (normalizedType === "outgoing") {
        if (!estimation_id) {
          console.log("No estimation found for project_id:", numericProjectId);
          return [];
        }
        query = `
          SELECT
              uf.*,
              u.name AS uploaded_by_name,
              'outgoing' AS direction
          FROM uploaded_files uf
          JOIN users u ON u.id = uf.uploaded_by_id
          LEFT JOIN estimation_uploaded_files euf ON uf.id = euf.uploaded_file_id
          LEFT JOIN drawings_uploaded_files duf ON uf.id = duf.uploaded_file_id
          LEFT JOIN drawings d ON duf.drawing_id = d.id
          LEFT JOIN drawing_stage_log_files dslf ON uf.id = dslf.uploaded_file_id
          WHERE (
              (euf.estimation_id = $2 AND uf.uploaded_by_id = $1)
              OR
              (d.project_id = $3 AND uf.uploaded_by_id = $1 AND dslf.type = 'outgoing')
          )
          ORDER BY uf.created_at DESC
        `;
        queryParams = [numericCurrentUserId, estimation_id, numericProjectId];
      } else if (normalizedType === "incoming") {
        query = `
          SELECT
              uf.*,
              u.name AS uploaded_by_name93
              'incoming' AS direction
          FROM uploaded_files uf
          JOIN users u ON u.id = uf.uploaded_by_id
          JOIN projects_uploaded_files puf ON uf.id = puf.uploaded_file_id
          WHERE puf.project_id = $1
          AND u.role = 'rfq'
          ORDER BY uf.created_at DESC
        `;
        queryParams = [numericProjectId];
      } else {
        // type = 'all'
        if (!estimation_id) {
          console.log(
            "No estimation found for project_id, returning incoming files only:",
            numericProjectId
          );
          query = `
            SELECT
                uf.*,
                u.name AS uploaded_by_name,
                'incoming' AS direction
            FROM uploaded_files uf
            JOIN users u ON u.id = uf.uploaded_by_id
            JOIN projects_uploaded_files puf ON uf.id = puf.uploaded_file_id
            WHERE puf.project_id = $1
            AND u.role = 'rfq'
            ORDER BY uf.created_at DESC
          `;
          queryParams = [numericProjectId];
        } else {
          query = `
            SELECT
                uf.*,
                u.name AS uploaded_by_name,
                CASE
                    WHEN uf.uploaded_by_id = $1 THEN 'outgoing'
                    ELSE 'incoming'
                END AS direction
            FROM uploaded_files uf
            JOIN users u ON u.id = uf.uploaded_by_id
            WHERE (
                EXISTS (
                    SELECT 1 FROM estimation_uploaded_files euf
                    WHERE euf.uploaded_file_id = uf.id
                    AND euf.estimation_id = $2
                    AND uf.uploaded_by_id = $1
                )
                OR
                EXISTS (
                    SELECT 1 FROM drawings_uploaded_files duf
                    JOIN drawings d ON duf.drawing_id = d.id
                    JOIN drawing_stage_log_files dslf ON uf.id = dslf.uploaded_file_id
                    WHERE d.project_id = $3
                    AND uf.uploaded_by_id = $1
                    AND dslf.type = 'outgoing'
                )
                OR
                EXISTS (
                    SELECT 1 FROM projects_uploaded_files puf
                    WHERE puf.uploaded_file_id = uf.id
                    AND puf.project_id = $3
                    AND u.role = 'rfq'
                )
            )
            ORDER BY uf.created_at DESC
          `;
          queryParams = [numericCurrentUserId, estimation_id, numericProjectId];
        }
      }
    } else {
      throw new Error("Invalid role");
    }

    if (!query) {
      console.log("No query constructed, returning empty array");
      return [];
    }

    console.log("Generated SQL Query:", query);
    console.log("Query Parameters:", queryParams);

    const { rows } = await pool.query(query, queryParams);
    console.log("Query Results:", rows);
    return rows;
  } catch (err) {
    console.error("Error in getFilesByType:", err);
    throw err;
  }
}