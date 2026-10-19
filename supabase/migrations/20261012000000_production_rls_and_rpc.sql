-- Production Row Level Security (RLS) & Atomic RPC migration
-- Migration: 20261012000000_production_rls_and_rpc

-- 1. Helper Functions
CREATE OR REPLACE FUNCTION get_current_platform_user_id()
RETURNS UUID AS $$
  SELECT id FROM platform_users 
  WHERE auth_user_id = auth.uid() OR id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_platform_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM platform_admins pa
    JOIN platform_users pu ON pa.user_id = pu.id
    WHERE pu.auth_user_id = auth.uid() OR pu.id = auth.uid()
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_business_id()
RETURNS UUID AS $$
  SELECT bu.business_id FROM business_users bu
  JOIN platform_users pu ON bu.user_id = pu.id
  WHERE (pu.auth_user_id = auth.uid() OR pu.id = auth.uid())
    AND bu.status = 'Active'
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION has_business_access(b_id UUID)
RETURNS BOOLEAN AS $$
  SELECT is_platform_admin() OR (
    EXISTS (
      SELECT 1 FROM business_users bu
      JOIN platform_users pu ON bu.user_id = pu.id
      WHERE bu.business_id = b_id
        AND (pu.auth_user_id = auth.uid() OR pu.id = auth.uid())
        AND bu.status = 'Active'
    )
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 2. Enable RLS on all tables
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies if any
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- 4. Policies for platform_users
CREATE POLICY "platform_users_select" ON platform_users FOR SELECT
  USING (is_platform_admin() OR auth_user_id = auth.uid() OR id = auth.uid());

CREATE POLICY "platform_users_insert" ON platform_users FOR INSERT
  WITH CHECK (is_platform_admin() OR auth_user_id = auth.uid() OR id = auth.uid());

CREATE POLICY "platform_users_update" ON platform_users FOR UPDATE
  USING (is_platform_admin() OR auth_user_id = auth.uid() OR id = auth.uid());

-- 5. Policies for platform_admins
CREATE POLICY "platform_admins_select" ON platform_admins FOR SELECT
  USING (is_platform_admin() OR user_id = get_current_platform_user_id());

CREATE POLICY "platform_admins_all" ON platform_admins FOR ALL
  USING (is_platform_admin());

-- 6. Policies for businesses
CREATE POLICY "businesses_select" ON businesses FOR SELECT
  USING (is_platform_admin() OR id = get_user_business_id() OR status = 'Active');

CREATE POLICY "businesses_insert" ON businesses FOR INSERT
  WITH CHECK (is_platform_admin() OR auth.role() = 'authenticated');

CREATE POLICY "businesses_update_delete" ON businesses FOR ALL
  USING (is_platform_admin() OR has_business_access(id));

-- 7. Policies for business_users
CREATE POLICY "business_users_select" ON business_users FOR SELECT
  USING (is_platform_admin() OR has_business_access(business_id) OR user_id = get_current_platform_user_id());

CREATE POLICY "business_users_all" ON business_users FOR ALL
  USING (is_platform_admin() OR has_business_access(business_id));

-- 8. Policies for categories
CREATE POLICY "categories_all" ON categories FOR ALL
  USING (has_business_access(business_id));

-- 9. Policies for products
CREATE POLICY "products_all" ON products FOR ALL
  USING (has_business_access(business_id));

-- 10. Policies for product_variants
CREATE POLICY "product_variants_all" ON product_variants FOR ALL
  USING (EXISTS (SELECT 1 FROM products p WHERE p.id = product_variants.product_id AND has_business_access(p.business_id)));

-- 11. Policies for inventory_locations
CREATE POLICY "inventory_locations_all" ON inventory_locations FOR ALL
  USING (has_business_access(business_id));

-- 12. Policies for inventory
CREATE POLICY "inventory_all" ON inventory FOR ALL
  USING (has_business_access(business_id));

-- 13. Policies for inventory_movements
CREATE POLICY "inventory_movements_all" ON inventory_movements FOR ALL
  USING (has_business_access(business_id));

-- 14. Policies for customers
CREATE POLICY "customers_all" ON customers FOR ALL
  USING (has_business_access(business_id));

-- 15. Policies for events
CREATE POLICY "events_select" ON events FOR SELECT
  USING (is_platform_wide = true OR (business_id IS NOT NULL AND has_business_access(business_id)));

CREATE POLICY "events_modify" ON events FOR ALL
  USING (is_platform_admin() OR (business_id IS NOT NULL AND has_business_access(business_id)));

-- 16. Policies for sales
CREATE POLICY "sales_all" ON sales FOR ALL
  USING (has_business_access(business_id));

-- 17. Policies for sale_items
CREATE POLICY "sale_items_all" ON sale_items FOR ALL
  USING (EXISTS (SELECT 1 FROM sales s WHERE s.id = sale_items.sale_id AND has_business_access(s.business_id)));

-- 18. Policies for returns & return_items
CREATE POLICY "returns_all" ON returns FOR ALL
  USING (has_business_access(business_id));

CREATE POLICY "return_items_all" ON return_items FOR ALL
  USING (EXISTS (SELECT 1 FROM returns r WHERE r.id = return_items.return_id AND has_business_access(r.business_id)));

-- 19. Policies for promotions
CREATE POLICY "promotions_select" ON promotions FOR SELECT
  USING (is_platform_wide = true OR (business_id IS NOT NULL AND has_business_access(business_id)));

CREATE POLICY "promotions_modify" ON promotions FOR ALL
  USING (is_platform_admin() OR (business_id IS NOT NULL AND has_business_access(business_id)));

-- 20. Policies for notifications & notification_recipients
CREATE POLICY "notifications_select" ON notifications FOR SELECT
  USING (is_platform_admin() OR business_id IS NULL OR has_business_access(business_id));

CREATE POLICY "notifications_modify" ON notifications FOR ALL
  USING (is_platform_admin() OR (business_id IS NOT NULL AND has_business_access(business_id)));

CREATE POLICY "notification_recipients_select" ON notification_recipients FOR SELECT
  USING (user_id = get_current_platform_user_id() OR is_platform_admin());

CREATE POLICY "notification_recipients_update" ON notification_recipients FOR UPDATE
  USING (user_id = get_current_platform_user_id() OR is_platform_admin());

-- 21. Policies for audit_logs
CREATE POLICY "audit_logs_select" ON audit_logs FOR SELECT
  USING (is_platform_admin() OR (business_id IS NOT NULL AND has_business_access(business_id)));

CREATE POLICY "audit_logs_insert" ON audit_logs FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- 22. Policies for settings
CREATE POLICY "business_settings_all" ON business_settings FOR ALL
  USING (has_business_access(business_id));

CREATE POLICY "platform_settings_select" ON platform_settings FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "platform_settings_modify" ON platform_settings FOR ALL
  USING (is_platform_admin());

-- 23. Atomic POS Checkout RPC
CREATE OR REPLACE FUNCTION create_sale(
  p_business_id UUID,
  p_user_id UUID,
  p_payment_method VARCHAR,
  p_items JSONB,
  p_total_amount DECIMAL,
  p_net_amount DECIMAL,
  p_discount_amount DECIMAL DEFAULT 0,
  p_tax_amount DECIMAL DEFAULT 0,
  p_customer_id UUID DEFAULT NULL,
  p_event_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_sale_id UUID;
  v_receipt_number VARCHAR;
  v_item JSONB;
  v_product_id UUID;
  v_variant_id UUID;
  v_qty INT;
  v_unit_price DECIMAL;
  v_total_price DECIMAL;
  v_inv_id UUID;
  v_location_id UUID;
  v_curr_qty INT;
  v_platform_user_id UUID;
BEGIN
  -- Determine matching platform_user id
  SELECT id INTO v_platform_user_id
  FROM platform_users
  WHERE id = p_user_id OR auth_user_id = p_user_id
  LIMIT 1;

  IF v_platform_user_id IS NULL THEN
    v_platform_user_id := get_current_platform_user_id();
  END IF;

  -- Generate receipt number
  v_receipt_number := 'RCPT-' || TO_CHAR(CURRENT_TIMESTAMP, 'YYYYMMDD-HH24MISS') || '-' || LPAD(FLOOR(RANDOM() * 1000)::TEXT, 3, '0');

  -- Insert sale
  INSERT INTO sales (
    business_id, receipt_number, user_id, customer_id, event_id,
    total_amount, discount_amount, tax_amount, net_amount, payment_method, status, notes
  ) VALUES (
    p_business_id, v_receipt_number, v_platform_user_id, p_customer_id, p_event_id,
    p_total_amount, p_discount_amount, p_tax_amount, p_net_amount, p_payment_method, 'Completed', p_notes
  ) RETURNING id INTO v_sale_id;

  -- Loop through items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    v_variant_id := CASE WHEN (v_item->>'variant_id') IS NOT NULL AND (v_item->>'variant_id') <> '' THEN (v_item->>'variant_id')::UUID ELSE NULL END;
    v_qty := (v_item->>'quantity')::INT;
    v_unit_price := (v_item->>'unit_price')::DECIMAL;
    v_total_price := (v_item->>'total_price')::DECIMAL;

    -- Insert sale item
    INSERT INTO sale_items (
      sale_id, product_id, variant_id, quantity, unit_price, discount, tax, total_price
    ) VALUES (
      v_sale_id, v_product_id, v_variant_id, v_qty, v_unit_price, 0, 0, v_total_price
    );

    -- Find and lock inventory row
    SELECT id, location_id, quantity INTO v_inv_id, v_location_id, v_curr_qty
    FROM inventory
    WHERE business_id = p_business_id 
      AND product_id = v_product_id
      AND (variant_id = v_variant_id OR (variant_id IS NULL AND v_variant_id IS NULL))
    ORDER BY quantity DESC
    LIMIT 1
    FOR UPDATE;

    IF v_inv_id IS NOT NULL THEN
      UPDATE inventory
      SET quantity = GREATEST(0, v_curr_qty - v_qty),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = v_inv_id;

      -- Record inventory movement
      INSERT INTO inventory_movements (
        business_id, location_id, product_id, variant_id,
        movement_type, quantity, previous_quantity, new_quantity,
        user_id, reference_id, notes
      ) VALUES (
        p_business_id, v_location_id, v_product_id, v_variant_id,
        'Sale', -v_qty, v_curr_qty, GREATEST(0, v_curr_qty - v_qty),
        v_platform_user_id, v_sale_id, 'Sale POS: ' || v_receipt_number
      );
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'sale_id', v_sale_id,
    'receipt_number', v_receipt_number
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
