import { Request, Response } from "express";
import db from "../db";

/* ======================================================
   📦 PRODUCT CONTROLLER — MySQL CRUD Engine with Multi-Image Support
   All catalog catalog queries are driven exclusively from the
   database connection pool. No CSV/file-based fallbacks.
====================================================== */

/* ──────────────────────────────────────────────────────
   A. GET ALL PRODUCTS (Consumer Storefront)
   GET /api/products
   Aggregates up to 6 product images using LEFT JOIN and GROUP_CONCAT
   to preserve transactional order and avoid duplicate records.
────────────────────────────────────────────────────── */
export const getAllProducts = (req: Request, res: Response) => {
  const sql = `
    SELECT p.*, GROUP_CONCAT(pi.image_url ORDER BY pi.sort_order ASC) as aggregated_images
    FROM \`products\` p
    LEFT JOIN \`product_images\` pi ON p.id = pi.product_id
    GROUP BY p.id
    ORDER BY p.id DESC
  `;

  db.query(sql, (err: any, rows: any[]) => {
    if (err) {
      console.error("❌ getAllProducts DB error:", err);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch products from database",
      });
    }

    const parsed = (rows || []).map((row: any) => {
      const images = row.aggregated_images ? row.aggregated_images.split(",") : [];
      // Fallback to legacy imageurl if images is empty
      if (images.length === 0 && row.imageurl) {
        images.push(row.imageurl);
      }
      return {
        ...row,
        images,
      };
    });

    return res.json({
      success: true,
      data: parsed,
      count: parsed.length,
    });
  });
};

/* ──────────────────────────────────────────────────────
   A2. GET INVENTORY PRODUCTS (Admin Dashboard)
   GET /api/products/inventory
   🎯 Enforce zero CSV file fallback. Direct MySQL streaming only.
────────────────────────────────────────────────────── */
export const getInventoryProducts = (req: Request, res: Response) => {
  const sql = `
    SELECT p.*, GROUP_CONCAT(pi.image_url ORDER BY pi.sort_order ASC) as aggregated_images
    FROM \`products\` p
    LEFT JOIN \`product_images\` pi ON p.id = pi.product_id
    GROUP BY p.id
    ORDER BY p.id DESC
  `;

  db.query(sql, (err: any, results: any[]) => {
    if (err) {
      console.error("❌ Database catalog fetch failure:", err.message);
      return res.status(500).json({ success: false, error: err.message });
    }

    const parsed = (results || []).map((row: any) => {
      const images = row.aggregated_images ? row.aggregated_images.split(",") : [];
      if (images.length === 0 && row.imageurl) {
        images.push(row.imageurl);
      }
      return {
        ...row,
        images,
      };
    });

    return res.status(200).json(parsed);
  });
};

/* ──────────────────────────────────────────────────────
   B. GET SINGLE PRODUCT BY ID
   GET /api/products/:id
────────────────────────────────────────────────────── */
export const getProductById = (req: Request, res: Response) => {
  const productId = Number(req.params.id);

  if (!productId || isNaN(productId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid product ID",
    });
  }

  const sql = `
    SELECT
      p.\`id\`,
      p.\`E_name\`,
      p.\`T_name\`,
      p.\`MRP\`,
      p.\`s_price\`,
      p.\`GST\`,
      p.\`imageurl\`,
      p.\`category\`,
      p.\`product_type\`,
      p.\`inStock\`,
      p.\`outStock\`,
      p.\`isOrganic\`,
      GROUP_CONCAT(pi.image_url ORDER BY pi.sort_order ASC) as aggregated_images
    FROM \`products\` p
    LEFT JOIN \`product_images\` pi ON p.id = pi.product_id
    WHERE p.\`id\` = ?
    GROUP BY p.id
    LIMIT 1
  `;

  db.query(sql, [productId], (err: any, rows: any[]) => {
    if (err) {
      console.error("❌ getProductById DB error:", err);
      return res.status(500).json({
        success: false,
        message: "Database error fetching product",
      });
    }

    if (!rows || rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const row = rows[0];
    const images = row.aggregated_images ? row.aggregated_images.split(",") : [];
    if (images.length === 0 && row.imageurl) {
      images.push(row.imageurl);
    }

    return res.json({
      success: true,
      data: {
        ...row,
        images,
      },
    });
  });
};

/* ──────────────────────────────────────────────────────
   C. CREATE PRODUCT
   POST /api/products/add
   Structured transactional bulk insertion of files and URLs mapping
────────────────────────────────────────────────────── */
export const createProduct = (req: Request, res: Response) => {
  console.log("🛑 [DEBUG] createProduct called with body:", req.body);
  const {
    E_name,
    T_name,
    MRP,
    s_price,
    GST,
    category,
    product_type,
    inStock,
    isOrganic,
  } = req.body;

  // Validate required fields
  if (!E_name || !category || !product_type) {
    console.log("❌ [DEBUG] Validation failed:", { E_name, category, product_type });
    return res.status(400).json({
      success: false,
      message: "Missing required fields: E_name, category, product_type",
    });
  }

  // Parse string fallbacks from req.body.imageUrls (which could be stringified JSON or plain string)
  let imageUrls: string[] = [];
  if (req.body.imageUrls) {
    try {
      const parsed = JSON.parse(req.body.imageUrls);
      if (Array.isArray(parsed)) {
        imageUrls = parsed;
      } else if (typeof parsed === "string") {
        imageUrls = [parsed];
      }
    } catch (e) {
      if (typeof req.body.imageUrls === "string") {
        imageUrls = req.body.imageUrls.split(",").map((s: string) => s.trim()).filter(Boolean);
      } else if (Array.isArray(req.body.imageUrls)) {
        imageUrls = req.body.imageUrls;
      }
    }
  }

  // Parse genuine binary uploads from multer
  const uploadedFiles = req.files as Express.Multer.File[] | undefined;
  const fileUrls = (uploadedFiles || []).map((file) => `/uploads/${file.filename}`);

  // Combine and enforce max 6 images
  const allUrls = [...fileUrls, ...imageUrls].filter(Boolean).slice(0, 6);
  const primaryImageUrl = allUrls[0] || "";

  db.getConnection((err, conn) => {
    if (err) {
      console.error("❌ Failed to get connection for transaction:", err);
      return res.status(500).json({
        success: false,
        message: "Database connection error",
      });
    }

    conn.beginTransaction((txErr) => {
      if (txErr) {
        conn.release();
        console.error("❌ Failed to begin transaction:", txErr);
        return res.status(500).json({
          success: false,
          message: "Failed to begin transaction",
        });
      }

      const insertSql = `
        INSERT INTO \`products\`
        (\`E_name\`, \`T_name\`, \`MRP\`, \`s_price\`, \`GST\`, \`imageurl\`, \`category\`, \`product_type\`, \`inStock\`, \`outStock\`, \`isOrganic\`)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
      `;

      const params = [
        String(E_name),
        String(T_name || ""),
        Number(MRP) || 0,
        Number(s_price) || 0,
        Number(GST) || 0,
        String(primaryImageUrl),
        String(category),
        String(product_type),
        Number(inStock) || 0,
        isOrganic && (isOrganic === "true" || isOrganic === 1 || isOrganic === true) ? 1 : 0,
      ];

      conn.query(insertSql, params, (insertErr, result: any) => {
        if (insertErr) {
          return conn.rollback(() => {
            conn.release();
            console.error("❌ createProduct INSERT error:", insertErr);
            return res.status(500).json({
              success: false,
              message: "Failed to insert product into database",
              error: (insertErr as any).sqlMessage || insertErr.message,
            });
          });
        }

        const productId = result.insertId;

        if (allUrls.length === 0) {
          return conn.commit((commitErr) => {
            if (commitErr) {
              return conn.rollback(() => {
                conn.release();
                console.error("❌ Commit error:", commitErr);
                return res.status(500).json({ success: false, message: "Transaction commit failure" });
              });
            }
            conn.release();
            return res.status(201).json({
              success: true,
              message: "Product created successfully",
              productId,
            });
          });
        }

        // Bulk insert product images
        const insertImagesSql = `
          INSERT INTO \`product_images\` (\`product_id\`, \`image_url\`, \`sort_order\`)
          VALUES ?
        `;
        const imageRows = allUrls.map((url, index) => [productId, url, index]);

        conn.query(insertImagesSql, [imageRows], (imageInsertErr) => {
          if (imageInsertErr) {
            return conn.rollback(() => {
              conn.release();
              console.error("❌ createProduct image insert error:", imageInsertErr);
              return res.status(500).json({
                success: false,
                message: "Failed to insert product images into database",
                error: (imageInsertErr as any).sqlMessage || imageInsertErr.message,
              });
            });
          }

          conn.commit((commitErr) => {
            if (commitErr) {
              return conn.rollback(() => {
                conn.release();
                console.error("❌ Commit error:", commitErr);
                return res.status(500).json({ success: false, message: "Transaction commit failure" });
              });
            }
            conn.release();
            console.log(`✅ Product created successfully with ${allUrls.length} images! ID: ${productId}`);
            return res.status(201).json({
              success: true,
              message: "Product created successfully",
              productId,
            });
          });
        });
      });
    });
  });
};

/* ──────────────────────────────────────────────────────
   D. UPDATE PRODUCT
   PUT /api/products/:id
   Structured transaction to update details and re-insert images
────────────────────────────────────────────────────── */
const UPDATABLE_COLUMNS = new Set([
  "E_name",
  "T_name",
  "MRP",
  "s_price",
  "GST",
  "imageurl",
  "category",
  "product_type",
  "inStock",
  "outStock",
  "isOrganic",
]);

export const updateProduct = (req: Request, res: Response) => {
  const productId = Number(req.params.id);

  if (!productId || isNaN(productId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid product ID",
    });
  }

  const body = req.body;

  // Check if we need to sync images
  const hasNewImages = req.files && (req.files as any).length > 0;
  const hasImageUrls = req.body.imageUrls !== undefined;

  let allUrls: string[] = [];
  let primaryImageUrl: string | null = null;

  if (hasNewImages || hasImageUrls) {
    let imageUrls: string[] = [];
    if (req.body.imageUrls) {
      try {
        const parsed = JSON.parse(req.body.imageUrls);
        if (Array.isArray(parsed)) {
          imageUrls = parsed;
        } else if (typeof parsed === "string") {
          imageUrls = [parsed];
        }
      } catch (e) {
        if (typeof req.body.imageUrls === "string") {
          imageUrls = req.body.imageUrls.split(",").map((s: string) => s.trim()).filter(Boolean);
        } else if (Array.isArray(req.body.imageUrls)) {
          imageUrls = req.body.imageUrls;
        }
      }
    }

    const uploadedFiles = req.files as Express.Multer.File[] | undefined;
    const fileUrls = (uploadedFiles || []).map((file) => `/uploads/${file.filename}`);

    allUrls = [...fileUrls, ...imageUrls].filter(Boolean).slice(0, 6);
    primaryImageUrl = allUrls[0] || "";
  }

  // Build dynamic SET clauses
  const setClauses: string[] = [];
  const values: any[] = [];

  for (const key of Object.keys(body)) {
    if (UPDATABLE_COLUMNS.has(key)) {
      // Skip imageurl if we are overriding it via the new images array
      if (key === "imageurl" && primaryImageUrl !== null) continue;

      setClauses.push(`\`${key}\` = ?`);

      if (["MRP", "s_price", "GST", "inStock", "outStock"].includes(key)) {
        values.push(Number(body[key]) || 0);
      } else if (key === "isOrganic") {
        values.push(body[key] === "true" || body[key] === 1 || body[key] === true ? 1 : 0);
      } else {
        values.push(String(body[key]));
      }
    }
  }

  // If new images were provided, manually update products.imageurl
  if (primaryImageUrl !== null) {
    setClauses.push("`imageurl` = ?");
    values.push(primaryImageUrl);
  }

  db.getConnection((err, conn) => {
    if (err) {
      console.error("❌ Failed to get connection for update:", err);
      return res.status(500).json({
        success: false,
        message: "Database connection error",
      });
    }

    conn.beginTransaction((txErr) => {
      if (txErr) {
        conn.release();
        return res.status(500).json({ success: false, message: "Transaction failed" });
      }

      // Update product fields if any
      const proceedWithImages = () => {
        if (!hasNewImages && !hasImageUrls) {
          // Commit transaction directly if no images to update
          return conn.commit((commitErr) => {
            if (commitErr) {
              return conn.rollback(() => {
                conn.release();
                console.error("❌ Commit error:", commitErr);
                return res.status(500).json({ success: false, message: "Transaction commit failure" });
              });
            }
            conn.release();
            return res.json({
              success: true,
              message: "Product updated successfully",
            });
          });
        }

        // Delete existing product images
        conn.query("DELETE FROM `product_images` WHERE `product_id` = ?", [productId], (delErr) => {
          if (delErr) {
            return conn.rollback(() => {
              conn.release();
              console.error("❌ Failed to clear product images:", delErr);
              return res.status(500).json({ success: false, message: "Failed to update product images" });
            });
          }

          if (allUrls.length === 0) {
            return conn.commit((commitErr) => {
              if (commitErr) {
                return conn.rollback(() => {
                  conn.release();
                  console.error("❌ Commit error:", commitErr);
                  return res.status(500).json({ success: false, message: "Transaction commit failure" });
                });
              }
              conn.release();
              return res.json({
                success: true,
                message: "Product updated successfully",
              });
            });
          }

          // Insert new image set
          const insertImagesSql = `
            INSERT INTO \`product_images\` (\`product_id\`, \`image_url\`, \`sort_order\`)
            VALUES ?
          `;
          const imageRows = allUrls.map((url, index) => [productId, url, index]);

          conn.query(insertImagesSql, [imageRows], (insErr) => {
            if (insErr) {
              return conn.rollback(() => {
                conn.release();
                console.error("❌ Failed to insert new product images:", insErr);
                return res.status(500).json({ success: false, message: "Failed to save updated product images" });
              });
            }

            conn.commit((commitErr) => {
              if (commitErr) {
                return conn.rollback(() => {
                  conn.release();
                  console.error("❌ Commit error:", commitErr);
                  return res.status(500).json({ success: false, message: "Transaction commit failure" });
                });
              }
              conn.release();
              console.log(`✅ Product #${productId} updated with ${allUrls.length} images!`);
              return res.json({
                success: true,
                message: "Product updated successfully",
              });
            });
          });
        });
      };

      if (setClauses.length > 0) {
        values.push(productId);
        const updateSql = `UPDATE \`products\` SET ${setClauses.join(", ")} WHERE \`id\` = ?`;

        conn.query(updateSql, values, (updateErr, result: any) => {
          if (updateErr) {
            return conn.rollback(() => {
              conn.release();
              console.error("❌ updateProduct DB update error:", updateErr);
              return res.status(500).json({
                success: false,
                message: "Failed to update product details",
              });
            });
          }

          if (result.affectedRows === 0) {
            return conn.rollback(() => {
              conn.release();
              return res.status(404).json({
                success: false,
                message: "Product not found",
              });
            });
          }

          proceedWithImages();
        });
      } else {
        proceedWithImages();
      }
    });
  });
};

/* ──────────────────────────────────────────────────────
   E. DELETE PRODUCT
   DELETE /api/products/:id
────────────────────────────────────────────────────── */
export const deleteProduct = (req: Request, res: Response) => {
  const productId = Number(req.params.id);

  if (!productId || isNaN(productId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid product ID",
    });
  }

  const deleteSql = "DELETE FROM `products` WHERE `id` = ?";

  db.query(deleteSql, [productId], (err: any, result: any) => {
    if (err) {
      console.error("❌ deleteProduct DB error:", err);
      return res.status(500).json({
        success: false,
        message: "Failed to delete product",
        error: err.sqlMessage || err.message,
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    console.log(`🗑️ Product #${productId} deleted successfully`);

    return res.json({
      success: true,
      message: "Product deleted successfully",
    });
  });
};
