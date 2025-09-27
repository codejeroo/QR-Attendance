# QR Code Attendance System

A modern web application for managing student attendance using QR codes. Built with React, Vite, TailwindCSS, and Supabase.

## Features

- **Authentication**: Secure teacher/admin login with Supabase Auth
- **Dashboard**: Overview of attendance statistics and recent activity
- **QR Code Scanning**: Real-time camera scanning for student attendance
- **Attendance Records**: Searchable and exportable attendance logs
- **Student Management**: Add, edit, delete students and generate QR codes
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## Tech Stack

- **Frontend**: React 18 + Vite
- **Styling**: TailwindCSS v3
- **Backend**: Supabase (Database + Auth)
- **QR Scanning**: html5-qrcode
- **Routing**: React Router DOM
- **Notifications**: React Hot Toast
- **Icons**: Lucide React

## Setup Instructions

### 1. Environment Setup

1. Copy the environment file:
   ```bash
   cp .env.example .env
   ```

2. Update `.env` with your Supabase credentials:
   ```
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

### 2. Supabase Database Setup

Create the following tables in your Supabase database:

#### Students Table
```sql
CREATE TABLE students (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);
```

#### Attendance Table
```sql
CREATE TABLE attendance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  scanned_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);
```

### 3. Row Level Security (RLS)

Enable RLS and create policies:

```sql
-- Enable RLS
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read/write
CREATE POLICY "Allow authenticated users" ON students FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated users" ON attendance FOR ALL TO authenticated USING (true);
```

### 4. Install Dependencies & Run

```bash
npm install
npm run dev
```

## Usage

### Login
Use the demo credentials or create a teacher account in Supabase Auth:
- Email: teacher@school.com
- Password: teacher123

### Adding Students
1. Go to "Students Management"
2. Click "Add Student"
3. Fill in the required information
4. Generate QR codes for each student

### Scanning Attendance
1. Go to "Scan Attendance"
2. Click "Start Scanning"
3. Allow camera permissions
4. Point camera at student QR codes
5. View real-time attendance log

### Viewing Records
1. Go to "Attendance Records"
2. Filter by date or search by student
3. Export data as CSV

## Project Structure

```
src/
├── components/
│   └── Layout.jsx          # Main layout with navigation
├── lib/
│   └── supabase.js         # Supabase client configuration
├── pages/
│   ├── Dashboard.jsx       # Statistics and overview
│   ├── Login.jsx           # Authentication
│   ├── ScanAttendance.jsx  # QR code scanning
│   ├── AttendanceRecords.jsx # Records management
│   └── StudentsManagement.jsx # Student CRUD
├── App.jsx                 # Main app component with routing
├── main.jsx               # React entry point
└── index.css              # TailwindCSS styles
```

## Key Features Explained

### QR Code Format
The system expects QR codes to contain either:
- Plain text with the student's school_id
- JSON object: `{"school_id": "STUDENT_ID"}`

### Duplicate Prevention
The system prevents duplicate attendance entries for the same student on the same day.

### Responsive Design
The interface adapts to different screen sizes with a collapsible sidebar on mobile.

### Real-time Updates
Attendance data refreshes automatically after scanning QR codes.

## Development

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Customization
- Modify colors in `tailwind.config.js`
- Update Supabase table schemas as needed
- Customize QR code generation in StudentsManagement.jsx

## Deployment

1. Build the project: `npm run build`
2. Deploy the `dist` folder to your hosting service
3. Ensure environment variables are set in production
4. Configure Supabase URL redirects if needed

## Security Considerations

- Enable RLS on all Supabase tables
- Use environment variables for sensitive data
- Implement proper authentication checks
- Validate QR code data before processing

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the MIT License.+ Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
