CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text, email text, phone text,
  college text, degree text, branch text, graduation_year int, cgpa text,
  skills text[] NOT NULL DEFAULT '{}', interests text[] NOT NULL DEFAULT '{}',
  career_goal text, location text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.resumes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL, file_name text NOT NULL, resume_text text NOT NULL,
  job_description text, analysis jsonb, match_score int,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resumes TO authenticated;
GRANT ALL ON public.resumes TO service_role;
ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own resumes" ON public.resumes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL, company text NOT NULL, location text NOT NULL,
  job_type text NOT NULL DEFAULT 'Full-time', experience text NOT NULL DEFAULT 'Fresher',
  salary text, skills text[] NOT NULL DEFAULT '{}', description text NOT NULL,
  eligibility text NOT NULL, apply_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.jobs TO authenticated;
GRANT ALL ON public.jobs TO service_role;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jobs readable" ON public.jobs FOR SELECT TO authenticated USING (true);

CREATE TABLE public.saved_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL, job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'saved', notes text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, job_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_jobs TO authenticated;
GRANT ALL ON public.saved_jobs TO service_role;
ALTER TABLE public.saved_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own saved" ON public.saved_jobs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.career_guidance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL, result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.career_guidance TO authenticated;
GRANT ALL ON public.career_guidance TO service_role;
ALTER TABLE public.career_guidance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own guidance" ON public.career_guidance FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.interviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL, role text NOT NULL,
  questions jsonb NOT NULL, answers jsonb, feedback jsonb, overall_score int,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.interviews TO authenticated;
GRANT ALL ON public.interviews TO service_role;
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own interviews" ON public.interviews FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.roadmaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL, target_role text NOT NULL,
  plan jsonb NOT NULL, completed text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.roadmaps TO authenticated;
GRANT ALL ON public.roadmaps TO service_role;
ALTER TABLE public.roadmaps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own roadmaps" ON public.roadmaps FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

INSERT INTO public.jobs (title, company, location, job_type, experience, salary, skills, description, eligibility, apply_url) VALUES
('Java Developer Trainee','Infosys','Bengaluru','Full-time','Fresher','₹3.6 - 4.5 LPA','{Java,"Spring Boot",SQL,OOP}','Build and maintain backend services using Java and Spring Boot in an agile team.','B.E/B.Tech/MCA 2025-26 batch, 60% throughout','https://www.infosys.com/careers/'),
('Associate Software Engineer','Accenture','Hyderabad','Full-time','Fresher','₹4.5 LPA','{Java,SQL,"Data Structures",Git}','Develop enterprise applications and participate in code reviews.','Any graduate in CS/IT, no active backlogs','https://www.accenture.com/in-en/careers'),
('Software Test Engineer','TCS','Chennai','Full-time','Fresher','₹3.4 LPA','{"Manual Testing",Selenium,Java,SQL}','Design test cases, run manual and automated tests, report defects.','B.E/B.Tech/B.Sc 2025-26, 60% aggregate','https://www.tcs.com/careers'),
('QA Automation Intern','Zoho','Chennai','Internship','Fresher','₹20,000/month','{Selenium,Java,TestNG}','Automate regression suites for SaaS products.','Final year students, CS/IT','https://www.zoho.com/careers/'),
('Data Analyst','Deloitte','Hyderabad','Full-time','0-2 years','₹5 - 7 LPA','{SQL,Excel,Python,"Power BI"}','Analyse business data and build dashboards for clients.','Graduate with strong analytics skills','https://www2.deloitte.com/in/en/careers.html'),
('Junior Data Analyst','Wipro','Pune','Full-time','Fresher','₹3.5 LPA','{SQL,Excel,Tableau,Statistics}','Clean, analyse and visualise data for reporting.','B.Tech/B.Sc/BCA 2025-26','https://careers.wipro.com/'),
('Frontend Developer','Freshworks','Chennai','Full-time','0-2 years','₹6 - 9 LPA','{React,JavaScript,HTML,CSS}','Build responsive product UI with React.','CS/IT graduates with React projects','https://www.freshworks.com/company/careers/'),
('Full Stack Developer','Cognizant','Hyderabad','Full-time','Fresher','₹4 LPA','{Java,"Spring Boot",React,MySQL}','Work on end-to-end features across React frontend and Spring Boot APIs.','B.E/B.Tech 2025-26, 60%','https://careers.cognizant.com/'),
('Python Developer','HCLTech','Noida','Full-time','0-2 years','₹4.5 - 6 LPA','{Python,Django,SQL,REST}','Develop REST APIs and data pipelines using Python.','Any engineering graduate','https://www.hcltech.com/careers'),
('Data Science Intern','Swiggy','Bengaluru','Internship','Fresher','₹35,000/month','{Python,"Machine Learning",SQL,Pandas}','Build ML models for demand forecasting.','Final year students with ML projects','https://careers.swiggy.com/'),
('Cloud Support Associate','Amazon','Hyderabad','Full-time','Fresher','₹6 LPA','{AWS,Linux,Networking}','Support customers on AWS infrastructure issues.','B.E/B.Tech CS/IT/ECE','https://www.amazon.jobs/'),
('Java Backend Developer','Capgemini','Mumbai','Full-time','0-2 years','₹5 - 7 LPA','{Java,"Spring Boot",Microservices,MySQL}','Design microservices and REST APIs.','B.E/B.Tech with Java experience','https://www.capgemini.com/in-en/careers/');