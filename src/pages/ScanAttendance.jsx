import { useState, useEffect, useRef } from 'react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { supabase } from '../lib/supabase'
import { QrCode, Camera, CheckCircle, XCircle, Users, Clock, Calendar, KeyboardIcon } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ScanAttendance() {
  const [scanner, setScanner] = useState(null)
  const [isScanning, setIsScanning] = useState(false)
  const [todayAttendance, setTodayAttendance] = useState([])
  const [stats, setStats] = useState({ total: 0, present: 0 })
  const [activeEvents, setActiveEvents] = useState([])
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [eventAttendance, setEventAttendance] = useState([])
  const [manualInput, setManualInput] = useState('')
  const [showManualInput, setShowManualInput] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStudent, setProcessingStudent] = useState(null)
  const scannerRef = useRef(null)

  useEffect(() => {
    fetchTodayAttendance()
    fetchActiveEvents()
    
    // Cleanup scanner on unmount
    return () => {
      try {
        if (scanner) {
          scanner.clear()
        }
      } catch (error) {
        console.error('Error cleaning up scanner:', error)
      }
    }
  }, [scanner]) // Add scanner as dependency

  const fetchTodayAttendance = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      
      // Get unique attendance records for today (prevent duplicates in count)
      const { data: attendanceData, error } = await supabase
        .from('attendance')
        .select(`
          id,
          scanned_at,
          student_id,
          students (
            school_id,
            first_name,
            last_name
          )
        `)
        .gte('scanned_at', `${today}T00:00:00.000Z`)
        .lt('scanned_at', `${today}T23:59:59.999Z`)
        .order('scanned_at', { ascending: false })

      if (error) throw error

      // Remove duplicate entries by student_id to prevent counting the same student multiple times
      const uniqueAttendance = attendanceData?.filter((record, index, arr) => 
        arr.findIndex(r => r.student_id === record.student_id) === index
      ) || []

      setTodayAttendance(uniqueAttendance)

      // Get total student count
      const { count: totalStudents } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })

      setStats({
        total: totalStudents || 0,
        present: uniqueAttendance.length || 0
      })
    } catch (error) {
      console.error('Error fetching attendance:', error)
      toast.error('Failed to load attendance data')
    }
  }

  const fetchActiveEvents = async () => {
    try {
      const now = new Date().toISOString()
      const { data: events, error } = await supabase
        .from('events')
        .select('*')
        .lte('start_date', now)
        .gte('end_date', now)
        .order('start_date', { ascending: true })

      if (error) throw error
      setActiveEvents(events || [])
    } catch (error) {
      console.error('Error fetching active events:', error)
    }
  }

  const fetchEventAttendance = async (eventId) => {
    try {
      const { data: attendanceData, error } = await supabase
        .from('event_attendance')
        .select(`
          id,
          scanned_at,
          students!event_attendance_student_id_fkey (
            id,
            student_id,
            first_name,
            last_name
          )
        `)
        .eq('event_id', eventId)
        .order('scanned_at', { ascending: false })

      if (error) throw error
      setEventAttendance(attendanceData || [])
    } catch (error) {
      console.error('Error fetching event attendance:', error)
      toast.error('Failed to load event attendance')
    }
  }

  useEffect(() => {
    if (selectedEvent) {
      fetchEventAttendance(selectedEvent.id)
    } else {
      setEventAttendance([])
    }
  }, [selectedEvent])

  const startScanning = () => {
    setIsScanning(true)
    
    // Use setTimeout to ensure DOM is updated before initializing scanner
    setTimeout(() => {
      const scannerElement = scannerRef.current || document.getElementById("qr-scanner")
      
      if (!scannerElement) {
        console.error('QR scanner element not found')
        setIsScanning(false)
        toast.error('QR scanner initialization failed')
        return
      }

      try {
        // Clear any existing scanner content
        scannerElement.innerHTML = ''
        
        const config = {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        }

        const html5QrcodeScanner = new Html5QrcodeScanner(
          "qr-scanner",
          config,
          false
        )

        html5QrcodeScanner.render(onScanSuccess, onScanError)
        setScanner(html5QrcodeScanner)
      } catch (error) {
        console.error('Error initializing QR scanner:', error)
        setIsScanning(false)
        toast.error('Failed to initialize camera. Please allow camera access and try again.')
      }
    }, 300)
  }

  const stopScanning = () => {
    try {
      if (scanner) {
        scanner.clear()
        setScanner(null)
      }
    } catch (error) {
      console.error('Error stopping scanner:', error)
    } finally {
      setIsScanning(false)
    }
  }

  const onScanSuccess = async (decodedText) => {
    // Prevent multiple rapid scans
    if (isProcessing) {
      return
    }

    try {
      setIsProcessing(true)
      
      // Extract school_id from QR code
      let schoolId
      
      try {
        const parsed = JSON.parse(decodedText)
        schoolId = parsed.school_id || parsed.id
      } catch {
        // If not JSON, assume the text is the school_id
        schoolId = decodedText.trim()
      }

      if (!schoolId) {
        toast.error('Invalid QR code format')
        setIsProcessing(false)
        return
      }

      // Show scanning animation
      setProcessingStudent({ school_id: schoolId, status: 'scanning' })

      // Add a delay to show the scanning animation
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Check if student exists
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('id, first_name, last_name, school_id')
        .eq('school_id', schoolId)
        .single()

      if (studentError || !student) {
        setProcessingStudent({ school_id: schoolId, status: 'error' })
        await new Promise(resolve => setTimeout(resolve, 1000))
        toast.error(`Student with ID ${schoolId} not found`)
        setProcessingStudent(null)
        setIsProcessing(false)
        return
      }

      // Update processing status with student info
      setProcessingStudent({ 
        ...student, 
        status: 'checking' 
      })

      // Check if already scanned today (for regular attendance)
      if (!selectedEvent) {
        const today = new Date().toISOString().split('T')[0]
        const { data: existingAttendance } = await supabase
          .from('attendance')
          .select('id')
          .eq('student_id', student.id)
          .gte('scanned_at', `${today}T00:00:00.000Z`)
          .lt('scanned_at', `${today}T23:59:59.999Z`)

        if (existingAttendance && existingAttendance.length > 0) {
          setProcessingStudent({ ...student, status: 'duplicate' })
          await new Promise(resolve => setTimeout(resolve, 1000))
          toast.error(`${student.first_name} ${student.last_name} already marked present today`)
          setProcessingStudent(null)
          setIsProcessing(false)
          return
        }
      }

      // Check if scanning for a specific event
      if (selectedEvent) {
        // Check if already attended this event
        const { data: existingEventAttendance } = await supabase
          .from('event_attendance')
          .select('id')
          .eq('event_id', selectedEvent.id)
          .eq('student_id', student.id)

        if (existingEventAttendance && existingEventAttendance.length > 0) {
          setProcessingStudent({ ...student, status: 'duplicate' })
          await new Promise(resolve => setTimeout(resolve, 1000))
          toast.error(`${student.first_name} ${student.last_name} already checked in to this event`)
          setProcessingStudent(null)
          setIsProcessing(false)
          return
        }

        // Record event attendance
        const { error: eventAttendanceError } = await supabase
          .from('event_attendance')
          .insert({
            event_id: selectedEvent.id,
            student_id: student.id,
            scanned_at: new Date().toISOString()
          })

        if (eventAttendanceError) throw eventAttendanceError

        setProcessingStudent({ ...student, status: 'success' })
        await new Promise(resolve => setTimeout(resolve, 1000))
        toast.success(`✅ ${student.first_name} ${student.last_name} checked in to ${selectedEvent.title}`)
        
        // Refresh event attendance
        fetchEventAttendance(selectedEvent.id)
      } else {
        // Record regular daily attendance
        const { error: attendanceError } = await supabase
          .from('attendance')
          .insert({
            student_id: student.id,
            scanned_at: new Date().toISOString()
          })

        if (attendanceError) throw attendanceError

        setProcessingStudent({ ...student, status: 'success' })
        await new Promise(resolve => setTimeout(resolve, 1000))
        toast.success(`✅ ${student.first_name} ${student.last_name} marked present`)
        
        // Refresh attendance data
        fetchTodayAttendance()
      }

      // Clear processing state
      setProcessingStudent(null)
      setIsProcessing(false)
      
    } catch (error) {
      console.error('Scan processing error:', error)
      setProcessingStudent(prev => prev ? { ...prev, status: 'error' } : null)
      await new Promise(resolve => setTimeout(resolve, 1000))
      toast.error('Error processing scan')
      setProcessingStudent(null)
      setIsProcessing(false)
    }
  }

  const onScanError = (error) => {
    // Ignore scan errors to avoid spam
    console.log('Scan error:', error)
  }

  const handleManualInput = async (e) => {
    e.preventDefault()
    
    if (!manualInput.trim()) {
      toast.error('Please enter a School ID')
      return
    }

    if (isProcessing) {
      return
    }

    // Use the same logic as QR scan with processing state
    await onScanSuccess(manualInput.trim())
    
    // Clear input after processing is complete
    setManualInput('')
    setShowManualInput(false)
  }

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <QrCode className="mr-3 h-8 w-8 text-blue-600" />
          Scan Attendance
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Use your device camera to scan student QR codes
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-md">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Students</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-md">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Present Today</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.present}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-md">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Absent Today</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.total - stats.present}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Scanner Section */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900 flex items-center">
              <Camera className="mr-2 h-5 w-5" />
              QR Code Scanner
            </h2>
          </div>
          <div className="p-6">
            {!isScanning ? (
              <div className="text-center">
                <div className="w-32 h-32 mx-auto mb-4 bg-gray-100 rounded-lg flex items-center justify-center">
                  <QrCode className="h-16 w-16 text-gray-400" />
                </div>
                <p className="text-gray-500 mb-4">
                  Click the button below to start scanning QR codes
                </p>
                
                <div className="space-y-3">
                  <button
                    onClick={startScanning}
                    className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Camera className="mr-2 h-4 w-4" />
                    Start QR Scanning
                  </button>
                  
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white text-gray-500">or</span>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => setShowManualInput(!showManualInput)}
                    className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <KeyboardIcon className="mr-2 h-4 w-4" />
                    Enter School ID Manually
                  </button>
                </div>

                {/* Manual Input Form */}
                {showManualInput && (
                  <div className="mt-4 p-4 border border-gray-200 rounded-md bg-gray-50">
                    <form onSubmit={handleManualInput}>
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={manualInput}
                          onChange={(e) => setManualInput(e.target.value)}
                          placeholder="Enter Student School ID"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        />
                        <button
                          type="submit"
                          className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                        >
                          Mark Present
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            ) : (
              <div className="relative">
                <div 
                  id="qr-scanner" 
                  ref={scannerRef}
                  className="mb-4 w-full rounded-lg overflow-hidden"
                  style={{ minHeight: '350px', backgroundColor: '#f3f4f6' }}
                ></div>
                
                {/* Scanning Animation Overlay */}
                {isProcessing && processingStudent && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg mb-4 fade-in-up">
                    <div className="bg-white rounded-lg p-6 max-w-sm mx-4 text-center">
                      {processingStudent.status === 'scanning' && (
                        <>
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                          <p className="text-gray-900 font-medium">Scanning QR Code...</p>
                          <p className="text-sm text-gray-500">ID: {processingStudent.school_id}</p>
                        </>
                      )}
                      
                      {processingStudent.status === 'checking' && (
                        <>
                          <div className="animate-pulse rounded-full h-12 w-12 bg-blue-100 flex items-center justify-center mx-auto mb-4">
                            <Users className="h-6 w-6 text-blue-600" />
                          </div>
                          <p className="text-gray-900 font-medium">Verifying Student...</p>
                          <p className="text-sm text-gray-500">{processingStudent.first_name} {processingStudent.last_name}</p>
                        </>
                      )}
                      
                      {processingStudent.status === 'success' && (
                        <>
                          <div className="rounded-full h-12 w-12 bg-green-100 flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="h-6 w-6 text-green-600" />
                          </div>
                          <p className="text-gray-900 font-medium">Success!</p>
                          <p className="text-sm text-gray-500">{processingStudent.first_name} {processingStudent.last_name} marked present</p>
                        </>
                      )}
                      
                      {processingStudent.status === 'duplicate' && (
                        <>
                          <div className="rounded-full h-12 w-12 bg-yellow-100 flex items-center justify-center mx-auto mb-4">
                            <XCircle className="h-6 w-6 text-yellow-600" />
                          </div>
                          <p className="text-gray-900 font-medium">Already Present</p>
                          <p className="text-sm text-gray-500">{processingStudent.first_name} {processingStudent.last_name}</p>
                        </>
                      )}
                      
                      {processingStudent.status === 'error' && (
                        <>
                          <div className="rounded-full h-12 w-12 bg-red-100 flex items-center justify-center mx-auto mb-4">
                            <XCircle className="h-6 w-6 text-red-600" />
                          </div>
                          <p className="text-gray-900 font-medium">Error</p>
                          <p className="text-sm text-gray-500">Please try again</p>
                        </>
                      )}
                    </div>
                  </div>
                )}
                <div className="text-center space-y-2">
                  <button
                    onClick={stopScanning}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Stop Scanning
                  </button>
                  
                  <div className="text-sm text-gray-500">
                    or{' '}
                    <button
                      onClick={() => setShowManualInput(!showManualInput)}
                      className="text-blue-600 hover:text-blue-700 underline"
                    >
                      enter School ID manually
                    </button>
                  </div>
                  
                  {/* Manual Input while scanning */}
                  {showManualInput && (
                    <div className="mt-3 p-3 border border-gray-200 rounded-md bg-gray-50">
                      <form onSubmit={handleManualInput}>
                        <div className="flex space-x-2">
                          <input
                            type="text"
                            value={manualInput}
                            onChange={(e) => setManualInput(e.target.value)}
                            placeholder="Enter Student School ID"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          />
                          <button
                            type="submit"
                            className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                          >
                            Submit
                          </button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Attendance Log */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900 flex items-center">
              <Clock className="mr-2 h-5 w-5" />
              {selectedEvent ? `${selectedEvent.title} Attendance` : "Today's Attendance Log"}
            </h2>
            {selectedEvent && (
              <p className="text-sm text-gray-600 mt-1">
                Event Date: {new Date(selectedEvent.start_date).toLocaleDateString()} - {new Date(selectedEvent.end_date).toLocaleDateString()}
              </p>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {(selectedEvent ? eventAttendance : todayAttendance).length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                {selectedEvent ? "No attendance records for this event" : "No attendance records for today"}
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {(selectedEvent ? eventAttendance : todayAttendance).map((record) => (
                  <div key={record.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {record.students.first_name} {record.students.last_name}
                        </p>
                        <p className="text-xs text-gray-500">
                          ID: {record.students.student_id || record.students.school_id}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-900">
                        {formatTime(record.scanned_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}