const bcrypt = require('bcryptjs');
const { getSupabaseServiceClient } = require('../config/supabase');

const mapRowToAdmin = (row) => {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    avatar: row.avatar,
    isActive: row.is_active,
    lastLogin: row.last_login,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
};

const assertNoSupabaseError = (error, message) => {
  if (!error) {
    return;
  }

  const wrappedError = new Error(error.message || message);
  wrappedError.code = error.code;
  wrappedError.details = error.details;
  wrappedError.hint = error.hint;
  throw wrappedError;
};

const getRowByEmail = async (email) => {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from('admin_users')
    .select('*')
    .eq('email', String(email).trim().toLowerCase())
    .maybeSingle();

  assertNoSupabaseError(error, 'Unable to fetch admin by email');
  return data;
};

const getRowById = async (id) => {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from('admin_users')
    .select('*')
    .eq('id', id)
    .eq('is_active', true)
    .maybeSingle();

  assertNoSupabaseError(error, 'Unable to fetch admin');
  return data;
};

const seedInitialAdmin = async ({
  name = 'Admin User',
  email = 'admin@example.com',
  password = 'admin123',
  role = 'admin'
} = {}) => {
  const normalizedEmail = String(email).trim().toLowerCase();
  const existingAdmin = await getRowByEmail(normalizedEmail);

  if (existingAdmin) {
    return mapRowToAdmin(existingAdmin);
  }

  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from('admin_users')
    .insert({
      name: String(name).trim(),
      email: normalizedEmail,
      password_hash: await bcrypt.hash(password, 12),
      role,
      avatar: '/images/user/user-01.png',
      is_active: true
    })
    .select('*')
    .single();

  assertNoSupabaseError(error, 'Unable to seed default admin');
  return mapRowToAdmin(data);
};

const authenticate = async (email, password) => {
  const admin = await getRowByEmail(email);

  if (!admin || admin.is_active !== true) {
    return null;
  }

  const isMatch = await bcrypt.compare(password, admin.password_hash);

  if (!isMatch) {
    return null;
  }

  const supabase = getSupabaseServiceClient();
  const { error } = await supabase
    .from('admin_users')
    .update({ last_login: new Date().toISOString() })
    .eq('id', admin.id);

  assertNoSupabaseError(error, 'Unable to update admin last login');
  return mapRowToAdmin({
    ...admin,
    last_login: new Date().toISOString()
  });
};

const getById = async (id) => {
  const admin = await getRowById(id);
  return mapRowToAdmin(admin);
};

const findByEmail = async (email) => {
  const admin = await getRowByEmail(email);
  return mapRowToAdmin(admin);
};

const create = async ({ name, email, password, role = 'admin' }) => {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from('admin_users')
    .insert({
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      password_hash: await bcrypt.hash(password, 12),
      role,
      avatar: '/images/user/user-01.png',
      is_active: true
    })
    .select('*')
    .single();

  assertNoSupabaseError(error, 'Unable to create admin');
  return mapRowToAdmin(data);
};

const updateProfile = async (id, updates) => {
  const supabase = getSupabaseServiceClient();
  const payload = {};

  if (typeof updates.name === 'string') {
    payload.name = updates.name.trim();
  }

  if (typeof updates.email === 'string') {
    payload.email = updates.email.trim().toLowerCase();
  }

  if (typeof updates.avatar === 'string') {
    payload.avatar = updates.avatar.trim();
  }

  const { data, error } = await supabase
    .from('admin_users')
    .update(payload)
    .eq('id', id)
    .select('*')
    .maybeSingle();

  assertNoSupabaseError(error, 'Unable to update admin profile');
  return mapRowToAdmin(data);
};

const changePassword = async (id, currentPassword, newPassword) => {
  const admin = await getRowById(id);

  if (!admin) {
    return { success: false, code: 'not_found' };
  }

  const isMatch = await bcrypt.compare(currentPassword, admin.password_hash);

  if (!isMatch) {
    return { success: false, code: 'invalid_password' };
  }

  const supabase = getSupabaseServiceClient();
  const { error } = await supabase
    .from('admin_users')
    .update({
      password_hash: await bcrypt.hash(newPassword, 12)
    })
    .eq('id', id);

  assertNoSupabaseError(error, 'Unable to change admin password');
  return { success: true };
};

module.exports = {
  seedInitialAdmin,
  authenticate,
  getById,
  findByEmail,
  create,
  updateProfile,
  changePassword
};
