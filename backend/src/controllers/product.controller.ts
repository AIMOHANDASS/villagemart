import { Request, Response } from "express";
import db from "../db";

/**
 * Clean image array before saving (filters invalid/empty entries and trims whitespace)
 */
export const cleanImages = (images: any): string[] => {
  if (!Array.isArray(images)) return [];
  return images
    .filter((img) => img && typeof img === "string" && img.trim().length > 10)
    .map((img) => img.trim());
};

/**
 * Constructs an absolute URL for a given relative image path.
 * Supports base64 data URLs, HTTPS URLs, and relative paths safely.
 */
export const getAbsoluteImageUrl = (req: Request, imageUrl: string | null | undefined): string => {
  const fallback = "/assets/placeholder.png";
  if (!imageUrl) {
    return `${process.env.BACKEND_URL || `${req.protocol}://${req.get("host")}`}${fallback}`;
  }

  const trimmed = imageUrl.trim();
  if (!trimmed) {
    return `${process.env.BACKEND_URL || `${req.protocol}://${req.get("host")}`}${fallback}`;
  }

  // Already a base64 data URI or fully qualified HTTPS/HTTP URL
  if (trimmed.startsWith("data:") || trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  const host = process.env.BACKEND_URL || `${req.protocol}://${req.get("host")}`;
  // Ensure host doesn't end with a slash, and relative path starts with a slash
  const baseHost = host.endsWith("/") ? host.slice(0, -1) : host;
  const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;

  return `${baseHost}${path}`;
};

/**
 * Ensures the product_images table exists and handles multi-image row insertion safely.
 * Saves up to 6 image slots into product_images with slot_index (1..6) and sort_order (0..5).
 */
export const ensureAndInsertProductImages = (
  conn: any,
  productId: number,
  allUrls: string[],
  done: (err: any) => void
) => {
  const createTableSql = `
    CREATE TABLE IF NOT EXISTS \`product_images\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`product_id\` INT NOT NULL,
      \`image_url\` LONGTEXT NOT NULL,
      \`sort_order\` INT DEFAULT 0,
      \`slot_index\` INT DEFAULT 1,
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX \`idx_product_images_product_id\` (\`product_id\`)
    )
  `;

  conn.query(createTableSql, (createErr: any) => {
    if (createErr) {
      console.warn("⚠️ Warning creating product_images table:", createErr.message);
    }

    // Refresh image slots: Delete old slots for this product ID
    conn.query("DELETE FROM `product_images` WHERE `product_id` = ?", [productId], (delErr: any) => {
      if (delErr) console.warn("⚠️ Warning clearing old product images:", delErr.message);

      if (allUrls.length === 0) return done(null);

      // Insert new image slots up to 6 with slot_index (1..6)
      const insertImagesSql = `
        INSERT INTO \`product_images\` (\`product_id\`, \`image_url\`, \`sort_order\`, \`slot_index\`)
        VALUES ?
      `;
      const imageRows = allUrls.slice(0, 6).map((url, index) => [productId, String(url).trim(), index, index + 1]);

      conn.query(insertImagesSql, [imageRows], (insertErr: any) => {
        if (!insertErr) return done(null);

        console.error("❌ Bulk insert images error, attempting fallback:", insertErr.message);

        // Fallback: Attempt individual inserts to rescue valid URLs
        let pending = imageRows.length;

        allUrls.slice(0, 6).forEach((url, index) => {
          conn.query(
            "INSERT INTO `product_images` (`product_id`, `image_url`, `sort_order`, `slot_index`) VALUES (?, ?, ?, ?)",
            [productId, String(url).trim(), index, index + 1],
            () => {
              pending--;
              if (pending === 0) done(null);
            }
          );
        });
      });
    });
  });
};

/**
 * Attaches image arrays to product objects using a clean two-query approach,
 * returning all associated image URLs (up to 6) in slot order.
 */
export const attachImagesToProducts = (req: Request, products: any[], done: (err: any, result: any[]) => void) => {
  if (!products || products.length === 0) return done(null, []);

  const productIds = products.map((p) => p.id);
  const sql = `
    SELECT product_id, image_url, sort_order, slot_index 
    FROM \`product_images\` 
    WHERE product_id IN (?) 
    ORDER BY product_id, COALESCE(slot_index, sort_order + 1) ASC
  `;

  db.query(sql, [productIds], (err: any, imgRows: any[]) => {
    const imagesByProductId: Record<number, string[]> = {};
    if (!err && imgRows) {
      imgRows.forEach((r: any) => {
        if (!imagesByProductId[r.product_id]) {
          imagesByProductId[r.product_id] = [];
        }
        imagesByProductId[r.product_id].push(getAbsoluteImageUrl(req, r.image_url));
      });
    }

    const formatted = products.map((p) => {
      const pImages = imagesByProductId[p.id] && imagesByProductId[p.id].length > 0 
        ? imagesByProductId[p.id] 
        : (p.imageurl ? [getAbsoluteImageUrl(req, p.imageurl)] : (p.image_url ? [getAbsoluteImageUrl(req, p.image_url)] : []));

      const primaryImg = pImages[0] || getAbsoluteImageUrl(req, p.imageurl || p.image_url);

      return {
        ...p,
        image_url: primaryImg,
        imageurl: primaryImg,
        images: pImages,
        mrp: p.MRP !== undefined ? p.MRP : p.mrp,
        sale_price: p.s_price !== undefined ? p.s_price : p.sale_price,
        gst_pct: p.GST !== undefined ? p.GST : p.gst_pct,
        stock_qty: p.inStock !== undefined ? p.inStock : p.stock_qty,
        averageRating: Number(p.averageRating) || 0,
        totalReviews: Number(p.totalReviews) || 0,
      };
    });

    done(null, formatted);
  });
};

/* ======================================================
   📦 PRODUCT CONTROLLER — MySQL CRUD Engine with 6-Image Support
====================================================== */

/* ──────────────────────────────────────────────────────
   A. GET ALL PRODUCTS (Consumer Storefront)
   GET /api/products
────────────────────────────────────────────────────── */
export const getAllProducts = async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
  const offset = (page - 1) * limit;

  const searchParam = ((req.query.search || req.query.q || "") as string).trim();
  const categoryParam = ((req.query.category || "") as string).trim();
  const seedParam = parseInt(req.query.seed as string);

  let orderByClause = "p.id DESC";
  if (!categoryParam || categoryParam.toLowerCase() === "all") {
    if (!isNaN(seedParam)) {
      orderByClause = `RAND(${seedParam}), p.id DESC`;
    }
  }

  let whereClauses = "WHERE 1=1";
  const queryParams: any[] = [];

  if (searchParam) {
    const searchTerm = `%${searchParam}%`;
    // search in names, or string category, or join category name
    whereClauses += " AND (p.E_name LIKE ? OR p.T_name LIKE ? OR p.category LIKE ? OR p.category_id IN (SELECT id FROM categories WHERE name LIKE ?))";
    queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
  }

  if (categoryParam && categoryParam.toLowerCase() !== "all") {
    const slug = categoryParam.toLowerCase().trim();
    if (!isNaN(Number(slug))) {
      // It's a category ID
      whereClauses += " AND p.category_id = ?";
      queryParams.push(Number(slug));
    } else {
      // Backward compatibility + dynamic lookup
      if (slug === 'garlands' || slug === 'garland') {
        whereClauses += ` AND (p.category_id IN (SELECT id FROM categories WHERE slug LIKE '%garland%') OR p.category LIKE '%garland%' OR p.category LIKE '%garlands%')`;
      } else if (slug === 'vegetables' || slug === 'vegetable') {
        whereClauses += ` AND (p.category_id IN (SELECT id FROM categories WHERE slug LIKE '%vegetable%') OR p.category LIKE '%vegetable%' OR p.category LIKE '%vegetables%')`;
      } else if (slug === 'fruits' || slug === 'fruit') {
        whereClauses += ` AND (p.category_id IN (SELECT id FROM categories WHERE slug LIKE '%fruit%') OR p.category LIKE '%fruit%' OR p.category LIKE '%fruits%')`;
      } else if (slug === 'groceries' || slug === 'grocery') {
        whereClauses += ` AND (p.category_id IN (SELECT id FROM categories WHERE slug LIKE '%grocer%') OR p.category LIKE '%grocer%')`;
      } else {
        whereClauses += " AND (p.category_id IN (SELECT id FROM categories WHERE slug = ? OR LOWER(name) = ?) OR p.category = ?)";
        queryParams.push(slug, slug, categoryParam);
      }
    }
  }

  try {
    // 1. Get the total products count for this query
    const countSql = `
      SELECT COUNT(DISTINCT p.id) AS total
      FROM \`products\` p
      ${whereClauses}
    `;

    const [countRows]: any = await db.promise().query(countSql, queryParams);
    const totalProducts = countRows?.[0]?.total || 0;
    const totalPages = Math.ceil(totalProducts / limit);

    // 2. Fetch the paginated products details
    const selectSql = `
      SELECT p.*, 
        COALESCE(ROUND(AVG(r.rating), 1), 0) AS averageRating,
        COUNT(DISTINCT r.id) AS reviewCount,
        COUNT(DISTINCT r.id) AS totalReviews
      FROM \`products\` p
      LEFT JOIN \`reviews\` r ON p.id = r.product_id
      ${whereClauses}
      GROUP BY p.id
      ORDER BY ${orderByClause}
      LIMIT ? OFFSET ?
    `;

    const [rows]: any = await db.promise().query(selectSql, [...queryParams, limit, offset]);

    attachImagesToProducts(req, rows || [], (attachErr, parsed) => {
      return res.json({
        success: true,
        products: parsed,
        data: parsed,
        totalProducts,
        totalPages,
        currentPage: page,
        hasMore: page < totalPages,
        pagination: {
          totalItems: totalProducts,
          currentPage: page,
          totalPages,
          limit,
          hasMore: page < totalPages,
        },
      });
    });
  } catch (error: any) {
    console.error("❌ getAllProducts DB error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch products from database",
      error: error.message,
    });
  }
};

/* ──────────────────────────────────────────────────────
   A2. GET INVENTORY PRODUCTS (Admin Dashboard)
   GET /api/products/inventory
────────────────────────────────────────────────────── */
export const getInventoryProducts = (req: Request, res: Response) => {
  // Delegate to getAdminProducts for consistent paginated behavior
  return getAdminProducts(req, res);
};

/* ──────────────────────────────────────────────────────
   A3. GET ADMIN PRODUCTS WITH PAGINATION
   GET /api/admin/products
   Supports: page, limit, search, category query params
────────────────────────────────────────────────────── */
export const getAdminProducts = async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
  const offset = (page - 1) * limit;

  const searchParam = ((req.query.search || req.query.q || "") as string).trim();
  const categoryParam = ((req.query.category || "") as string).trim();

  let whereClauses = "WHERE 1=1";
  const queryParams: any[] = [];

  if (searchParam) {
    const searchTerm = `%${searchParam}%`;
    whereClauses += " AND (p.E_name LIKE ? OR p.T_name LIKE ? OR p.category LIKE ? OR p.category_id IN (SELECT id FROM categories WHERE name LIKE ?))";
    queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
  }

  if (categoryParam && categoryParam.toLowerCase() !== "all") {
    const slug = categoryParam.toLowerCase().trim();
    if (!isNaN(Number(slug))) {
      whereClauses += " AND p.category_id = ?";
      queryParams.push(Number(slug));
    } else {
      whereClauses += " AND (p.category = ? OR p.category_id IN (SELECT id FROM categories WHERE slug = ? OR LOWER(name) = ?))";
      queryParams.push(categoryParam, slug, slug);
    }
  }

  try {
    // 1. Total count for pagination metadata
    const countSql = `
      SELECT COUNT(*) AS total
      FROM \`products\` p
      ${whereClauses}
    `;
    const [countRows]: any = await db.promise().query(countSql, queryParams);
    const totalProducts = countRows?.[0]?.total || 0;
    const totalPages = Math.ceil(totalProducts / limit);

    // 2. Fetch paginated product rows
    const selectSql = `
      SELECT p.*
      FROM \`products\` p
      ${whereClauses}
      ORDER BY p.id DESC
      LIMIT ? OFFSET ?
    `;
    const [rows]: any = await db.promise().query(selectSql, [...queryParams, limit, offset]);

    attachImagesToProducts(req, rows || [], (attachErr, parsed) => {
      return res.status(200).json({
        success: true,
        products: parsed,
        data: parsed,
        totalProducts,
        totalPages,
        currentPage: page,
        hasMore: page < totalPages,
        pagination: {
          totalItems: totalProducts,
          currentPage: page,
          totalPages,
          limit,
          hasMore: page < totalPages,
        },
      });
    });
  } catch (error: any) {
    console.error("❌ getAdminProducts DB error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch admin products from database",
      error: error.message,
    });
  }
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
      p.*,
      COALESCE(ROUND(AVG(r.rating), 1), 0) AS averageRating,
      COUNT(DISTINCT r.id) AS reviewCount,
      COUNT(DISTINCT r.id) AS totalReviews
    FROM \`products\` p
    LEFT JOIN \`reviews\` r ON p.id = r.product_id
    WHERE p.\`id\` = ?
    GROUP BY p.id
    LIMIT 1
  `;

  db.query(sql, [productId], (err: any, mainRows: any[]) => {
    if (err) {
      console.error("❌ getProductById DB error:", err);
      return res.status(500).json({
        success: false,
        message: "Database error fetching product",
      });
    }

    if (!mainRows || mainRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const rawMainProduct = mainRows[0];

    // Fetch 20-25 recommended products (same category first, then RAND())
    const recSql = `
      SELECT p.*,
        COALESCE(ROUND(AVG(r.rating), 1), 0) AS averageRating,
        COUNT(DISTINCT r.id) AS reviewCount
      FROM \`products\` p
      LEFT JOIN \`reviews\` r ON p.id = r.product_id
      WHERE p.\`id\` != ?
      GROUP BY p.id
      ORDER BY (p.category = ?) DESC, p.id DESC
      LIMIT 25
    `;

    db.query(recSql, [productId, rawMainProduct.category || ""], (recErr: any, recRows: any[]) => {
      const allToProcess = [rawMainProduct, ...(recRows || [])];

      attachImagesToProducts(req, allToProcess, (attachErr, formattedList) => {
        const mainProduct = formattedList[0];
        const recommendations = formattedList.slice(1);

        return res.json({
          success: true,
          data: mainProduct,
          product: mainProduct,
          recommendations: recommendations,
        });
      });
    });
  });
};

/* ──────────────────────────────────────────────────────
   B2. GET PRODUCT DETAILS WITH RECOMMENDATIONS
   GET /api/products/details/:id
────────────────────────────────────────────────────── */
export const getProductDetailsWithRecommendations = (req: Request, res: Response) => {
  return getProductById(req, res);
};

/* ──────────────────────────────────────────────────────
   C. CREATE PRODUCT
   POST /api/products/add
   Structured transactional bulk insertion of files and URLs mapping
────────────────────────────────────────────────────── */
export const createProduct = (req: Request, res: Response) => {
  console.log("🛑 [DEBUG] createProduct called with body:", req.body);
  const E_name = req.body.E_name;
  const T_name = req.body.T_name;
  const MRP = req.body.MRP !== undefined ? req.body.MRP : req.body.mrp;
  const s_price = req.body.s_price !== undefined ? req.body.s_price : req.body.sale_price;
  const GST = req.body.GST !== undefined ? req.body.GST : req.body.gst_pct;
  const category = req.body.category;
  const category_id = req.body.category_id || null;
  const product_type = req.body.product_type;
  const inStock = req.body.inStock !== undefined ? req.body.inStock : (req.body.stock_qty !== undefined ? req.body.stock_qty : 0);
  const isOrganic = req.body.isOrganic;

  // Validate required fields
  if (!E_name || !category || !product_type) {
    console.log("❌ [DEBUG] Validation failed:", { E_name, category, product_type });
    return res.status(400).json({
      success: false,
      message: "Missing required fields: E_name, category, product_type",
    });
  }

  // Clean image array before saving
  let imageUrls: string[] = [];
  const rawImageSource = req.body.images || req.body.imageUrls;
  if (rawImageSource) {
    if (Array.isArray(rawImageSource)) {
      imageUrls = cleanImages(rawImageSource);
    } else {
      try {
        const parsed = JSON.parse(rawImageSource);
        if (Array.isArray(parsed)) {
          imageUrls = cleanImages(parsed);
        } else if (typeof parsed === "string") {
          imageUrls = cleanImages([parsed]);
        }
      } catch (e) {
        if (typeof rawImageSource === "string") {
          imageUrls = cleanImages(rawImageSource.split(","));
        }
      }
    }
  }

  // Parse genuine binary uploads from multer
  const uploadedFiles = req.files as Express.Multer.File[] | undefined;
  const fileUrls = (uploadedFiles || []).map((file) => {
    if (file.filename.startsWith("http://") || file.filename.startsWith("https://")) {
      return file.filename;
    }
    return `/uploads/${file.filename}`;
  });

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
        (\`E_name\`, \`T_name\`, \`MRP\`, \`s_price\`, \`GST\`, \`imageurl\`, \`category\`, \`category_id\`, \`product_type\`, \`inStock\`, \`outStock\`, \`isOrganic\`)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
      `;

      const params = [
        String(E_name),
        String(T_name || ""),
        Number(MRP) || 0,
        Number(s_price) || 0,
        Number(GST) || 0,
        String(primaryImageUrl),
        String(category),
        category_id ? Number(category_id) : null,
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

        // Ensure product_images table exists and insert images
        ensureAndInsertProductImages(conn, productId, allUrls, (imgErr) => {
          if (imgErr) {
            console.warn("⚠️ Non-fatal image insertion error:", imgErr);
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
            console.log(`✅ Product created successfully! ID: ${productId}, Images: ${allUrls.length}`);
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
  "category_id",
  "product_type",
  "inStock",
  "outStock",
  "isOrganic",
]);

export const updateProduct = (req: Request, res: Response) => {
  try {
  const productId = Number(req.params.id);

  if (!productId || isNaN(productId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid product ID",
    });
  }

  console.log(`📝 [updateProduct] Product #${productId} — Body keys: [${Object.keys(req.body).join(', ')}], imageUrls type: ${typeof req.body.imageUrls}, isArray: ${Array.isArray(req.body.imageUrls)}, files: ${(req.files as any)?.length || 0}`);

  const body = req.body;

  // Check if we need to sync images
  const hasNewImages = req.files && (req.files as any).length > 0;
  const hasImageUrls = req.body.imageUrls !== undefined;

  let allUrls: string[] = [];
  let primaryImageUrl: string | null = null;

  if (hasNewImages || hasImageUrls) {
    let imageUrls: string[] = [];
    if (req.body.imageUrls) {
      // Handle imageUrls whether it's already an array (JSON body) or a string (FormData)
      if (Array.isArray(req.body.imageUrls)) {
        imageUrls = req.body.imageUrls.filter((u: any) => u && typeof u === "string");
      } else if (typeof req.body.imageUrls === "string") {
        try {
          const parsed = JSON.parse(req.body.imageUrls);
          if (Array.isArray(parsed)) {
            imageUrls = parsed;
          } else if (typeof parsed === "string") {
            imageUrls = [parsed];
          }
        } catch (e) {
          // Not valid JSON — treat as comma-separated list (but preserve URLs with commas in query params)
          // Only split on commas that are followed by http/https to avoid mangling URLs
          imageUrls = req.body.imageUrls.split(/,(?=https?:\/\/)/).map((s: string) => s.trim()).filter(Boolean);
        }
      }
    }

    const uploadedFiles = req.files as Express.Multer.File[] | undefined;
    const fileUrls = (uploadedFiles || []).map((file) => {
      if (file.filename.startsWith("http://") || file.filename.startsWith("https://")) {
        return file.filename;
      }
      return `/uploads/${file.filename}`;
    });

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
      } else if (key === "category_id") {
        // category_id must be a valid number or NULL — never an empty string
        const catId = Number(body[key]);
        values.push(catId && !isNaN(catId) ? catId : null);
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

          ensureAndInsertProductImages(conn, productId, allUrls, (insErr) => {
            if (insErr) {
              console.warn("⚠️ Non-fatal image insertion error in updateProduct:", insErr);
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
  } catch (error: any) {
    console.error("❌ [updateProduct] Unhandled error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while updating product",
      error: error.message,
    });
  }
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

/* ──────────────────────────────────────────────────────
   F. UPLOAD IMAGE
   POST /api/products/upload-image
   Accepts single file under field 'product_img' and returns absolute URL
────────────────────────────────────────────────────── */
export const uploadImage = (req: Request, res: Response) => {
  const file = req.file || (Array.isArray(req.files) ? req.files[0] : undefined);
  if (!file) {
    return res.status(400).json({
      success: false,
      message: "No file uploaded",
    });
  }

  let fileUrl = "";

  if (file.filename.startsWith("http://") || file.filename.startsWith("https://")) {
    fileUrl = file.filename;
  } else if (file.path && (file.path.startsWith("http://") || file.path.startsWith("https://"))) {
    fileUrl = file.path;
  } else {
    fileUrl = `/uploads/${file.filename}`;
  }

  const absoluteUrl = getAbsoluteImageUrl(req, fileUrl);

  return res.json({
    success: true,
    url: absoluteUrl,
  });
};

/* ──────────────────────────────────────────────────────
   G. SEARCH & FILTER PRODUCTS
   GET /api/products/search?search=query&category=category
   GET /api/products/search?q=query
   Searches across E_name, T_name, and category using SQL LIKE
   Returns matching product items with all associated images
────────────────────────────────────────────────────── */
export const searchProducts = (req: Request, res: Response) => {
  const searchParam = ((req.query.search || req.query.q || "") as string).trim();
  const categoryParam = ((req.query.category || "") as string).trim();

  let sql = `
    SELECT p.*,
      COALESCE(ROUND(AVG(r.rating), 1), 0) AS averageRating,
      COUNT(DISTINCT r.id) AS reviewCount,
      COUNT(DISTINCT r.id) AS totalReviews
    FROM \`products\` p
    LEFT JOIN \`reviews\` r ON p.id = r.product_id
    WHERE 1=1
  `;
  const queryParams: any[] = [];

  if (searchParam) {
    const searchTerm = `%${searchParam}%`;
    // Match if search term is in English Name, Tamil Name, OR Category
    sql += ` AND (p.E_name LIKE ? OR p.T_name LIKE ? OR p.category LIKE ? OR p.category_id IN (SELECT id FROM categories WHERE name LIKE ?))`;
    queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
  }

  if (categoryParam && categoryParam.toLowerCase() !== "all") {
    const slug = categoryParam.toLowerCase().trim();
    if (!isNaN(Number(slug))) {
      sql += " AND p.category_id = ?";
      queryParams.push(Number(slug));
    } else {
      if (slug === 'garlands' || slug === 'garland') {
        sql += ` AND (p.category_id IN (SELECT id FROM categories WHERE slug LIKE '%garland%') OR p.category LIKE '%garland%' OR p.category LIKE '%garlands%')`;
      } else if (slug === 'vegetables' || slug === 'vegetable') {
        sql += ` AND (p.category_id IN (SELECT id FROM categories WHERE slug LIKE '%vegetable%') OR p.category LIKE '%vegetable%' OR p.category LIKE '%vegetables%')`;
      } else if (slug === 'fruits' || slug === 'fruit') {
        sql += ` AND (p.category_id IN (SELECT id FROM categories WHERE slug LIKE '%fruit%') OR p.category LIKE '%fruit%' OR p.category LIKE '%fruits%')`;
      } else if (slug === 'groceries' || slug === 'grocery') {
        sql += ` AND (p.category_id IN (SELECT id FROM categories WHERE slug LIKE '%grocer%') OR p.category LIKE '%grocer%')`;
      } else {
        sql += ` AND (p.category_id IN (SELECT id FROM categories WHERE slug = ? OR LOWER(name) = ?) OR p.category LIKE ?)`;
        queryParams.push(slug, slug, `%${categoryParam}%`);
      }
    }
  }

  sql += ` GROUP BY p.id ORDER BY p.id DESC`;

  // Limit to 15 only if it's a live dropdown autocomplete (req.query.q present without search/category)
  if (req.query.q && !req.query.search && !req.query.category) {
    sql += ` LIMIT 15`;
  } else {
    sql += ` LIMIT 50`;
  }

  db.query(sql, queryParams, (err: any, rows: any[]) => {
    if (err) {
      console.error("❌ searchProducts DB error:", err);
      return res.status(500).json({
        success: false,
        message: "Search query failed",
        error: err.message,
      });
    }

    attachImagesToProducts(req, rows || [], (attachErr, parsed) => {
      return res.status(200).json({
        success: true,
        count: parsed.length,
        products: parsed,
        data: parsed,
      });
    });
  });
};

/* ──────────────────────────────────────────────────────
   H. GET CATEGORY COUNTS
   GET /api/products/categories/counts
────────────────────────────────────────────────────── */
export const getCategoryCounts = async (req: Request, res: Response) => {
  try {
    const sql = `
      SELECT 
        c.name as dynamic_category,
        p.category as legacy_category,
        COUNT(*) as count
      FROM \`products\` p
      LEFT JOIN \`categories\` c ON p.category_id = c.id
      GROUP BY p.category_id, p.category, c.name
    `;
    const [rows]: any = await db.promise().query(sql);
    const counts: Record<string, number> = {};
    if (Array.isArray(rows)) {
      rows.forEach((row: any) => {
        const catName = row.dynamic_category || row.legacy_category;
        if (catName) {
          counts[catName] = (counts[catName] || 0) + row.count;
        }
      });
    }
    return res.json({
      success: true,
      counts
    });
  } catch (error: any) {
    console.error("❌ getCategoryCounts error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch category counts",
      error: error.message
    });
  }
};

