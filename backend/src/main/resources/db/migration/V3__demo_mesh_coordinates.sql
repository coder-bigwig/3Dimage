-- The demo seed uses the NIfTI affine coordinates from build-msd-lung-glb.py (RAS).
UPDATE case_result
SET coordinate_system = 'RAS'
WHERE id = '10000000-0000-0000-0000-000000000001'
  AND case_code = 'DEMO-LUNG-001';
