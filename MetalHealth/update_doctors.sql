-- Update doctors table with mental health specialists
-- First, clear existing data
DELETE FROM Doctors;

-- Insert new mental health specialists
INSERT INTO Doctors (name, speciality, phoneno, details) VALUES
('Dr. Sarah Williams', 'Psychiatry', '1234567890', 'Board-certified psychiatrist with 15+ years of experience in treating depression, anxiety, bipolar disorder, and PTSD. Specializes in medication management and psychotherapy for adults and adolescents.'),
('Dr. Michael Chen', 'Clinical Psychology', '1234567891', 'Licensed clinical psychologist specializing in cognitive-behavioral therapy (CBT) and trauma-focused therapy. Expert in treating anxiety disorders, depression, and relationship issues.'),
('Dr. Emily Rodriguez', 'Child & Adolescent Psychiatry', '1234567892', 'Child and adolescent psychiatrist with expertise in ADHD, autism spectrum disorders, and mood disorders in young people. Provides family therapy and school consultation services.'),
('Dr. David Thompson', 'Addiction Psychiatry', '1234567893', 'Addiction psychiatrist specializing in substance use disorders, dual diagnosis, and recovery support. Offers both inpatient and outpatient treatment programs.'),
('Dr. Lisa Wang', 'Geriatric Psychiatry', '1234567894', 'Geriatric psychiatrist focusing on mental health issues in older adults including dementia, late-life depression, and anxiety. Provides comprehensive care for aging populations.'),
('Dr. Robert Martinez', 'Trauma & PTSD Specialist', '1234567895', 'Trauma specialist with extensive experience in treating PTSD, complex trauma, and dissociative disorders. Uses evidence-based treatments including EMDR and trauma-focused CBT.'),
('Dr. Jennifer Lee', 'Eating Disorders', '1234567896', 'Specialist in eating disorders including anorexia, bulimia, and binge eating disorder. Provides comprehensive treatment including medical, nutritional, and psychological support.'),
('Dr. James Wilson', 'Couples & Family Therapy', '1234567897', 'Licensed marriage and family therapist specializing in relationship counseling, family dynamics, and communication issues. Helps couples and families navigate challenging situations.'),
('Dr. Maria Garcia', 'Crisis Intervention', '1234567898', 'Crisis intervention specialist with expertise in suicide prevention, emergency mental health services, and acute psychiatric care. Available for urgent mental health situations.'),
('Dr. Alex Kumar', 'Neuropsychology', '1234567899', 'Clinical neuropsychologist specializing in brain-behavior relationships, cognitive assessment, and rehabilitation. Expert in treating brain injury, dementia, and cognitive disorders.');
