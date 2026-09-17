-- =====================================================
-- VillageMart Performance Indexes Migration
-- Eliminates full-table scans on products (7,000+ rows)
-- =====================================================

-- 1. Composite index: category filtering + DESC ordering
--    Accelerates: WHERE category = ? ORDER BY id DESC
CREATE INDEX idx_products_category_id ON products(category, id);

-- 2. Date-based sorting index
--    Accelerates: ORDER BY created_at DESC, id DESC
CREATE INDEX idx_products_created_id ON products(created_at, id);

-- 3. Fulltext index for search across English and Tamil names
--    Accelerates: WHERE E_name LIKE '%term%' OR T_name LIKE '%term%'
CREATE FULLTEXT INDEX idx_products_search ON products(E_name, T_name);

-- 4. Composite index on product_images for faster JOINs
--    Accelerates: WHERE product_id IN (...) ORDER BY slot_index
CREATE INDEX idx_product_images_product_slot ON product_images(product_id, slot_index);
