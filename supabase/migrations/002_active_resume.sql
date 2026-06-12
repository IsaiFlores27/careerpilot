-- Columna para CV activo seleccionado por el usuario
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS active_resume_id uuid REFERENCES resumes(id) ON DELETE SET NULL;
