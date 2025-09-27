import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { 
  Users, 
  UserCheck, 
  UserX, 
  TrendingUp,
  Calendar,
  Clock
} from 'lucide-react'

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalStudents: 0,
    presentToday: 0,
    absentToday: 0,
    attendanceRate: 0
  })
  const [recentAttendance, setRecentAttendance] = useState([])
  const [weeklyStats, setWeeklyStats] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      // Fetch total students
      const { count: totalStudents } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })

      // Fetch today's attendance
      const today = new Date().toISOString().split('T')[0]
      const { data: todayAttendance, error: todayError } = await supabase
        .from('attendance')
        .select(`
          id,
          scanned_at,
          students (
            school_id,
            first_name,
            last_name
          )
        `)
        .gte('scanned_at', `${today}T00:00:00.000Z`)
        .lt('scanned_at', `${today}T23:59:59.999Z`)
        .order('scanned_at', { ascending: false })
        .limit(10)

      if (todayError) throw todayError

      const presentToday = todayAttendance?.length || 0
      const absentToday = (totalStudents || 0) - presentToday
      const attendanceRate = totalStudents > 0 ? Math.round((presentToday / totalStudents) * 100) : 0

      setStats({
        totalStudents: totalStudents || 0,
        presentToday,
        absentToday,
        attendanceRate
      })

      setRecentAttendance(todayAttendance || [])

      // Fetch weekly stats
      await fetchWeeklyStats()

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchWeeklyStats = async () => {
    try {
      const weeklyData = []
      const today = new Date()
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today)
        date.setDate(date.getDate() - i)
        const dateString = date.toISOString().split('T')[0]
        
        const { count } = await supabase
          .from('attendance')
          .select('*', { count: 'exact', head: true })
          .gte('scanned_at', `${dateString}T00:00:00.000Z`)
          .lt('scanned_at', `${dateString}T23:59:59.999Z`)

        weeklyData.push({
          date: dateString,
          day: date.toLocaleDateString('en-US', { weekday: 'short' }),
          count: count || 0
        })
      }
      
      setWeeklyStats(weeklyData)
    } catch (error) {
      console.error('Error fetching weekly stats:', error)
    }
  }

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-200 h-32 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Overview of attendance statistics and recent activity
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-md">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Students</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalStudents}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-md">
              <UserCheck className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Present Today</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.presentToday}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-md">
              <UserX className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Absent Today</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.absentToday}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-md">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Attendance Rate</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.attendanceRate}%</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Weekly Attendance Chart */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900 flex items-center">
              <Calendar className="mr-2 h-5 w-5" />
              Weekly Attendance
            </h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {weeklyStats.map((day, index) => {
                const maxCount = Math.max(...weeklyStats.map(d => d.count))
                const percentage = maxCount > 0 ? (day.count / maxCount) * 100 : 0
                const isToday = day.date === new Date().toISOString().split('T')[0]
                
                return (
                  <div key={index} className="flex items-center">
                    <div className="w-12 text-sm text-gray-500">
                      {day.day}
                    </div>
                    <div className="flex-1 mx-4">
                      <div className="h-6 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-300 ${
                            isToday ? 'bg-blue-600' : 'bg-green-500'
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                    <div className="w-12 text-right text-sm font-medium text-gray-900">
                      {day.count}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Recent Attendance */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900 flex items-center">
              <Clock className="mr-2 h-5 w-5" />
              Recent Attendance (Today)
            </h2>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {recentAttendance.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                No attendance records for today
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {recentAttendance.map((record) => (
                  <div key={record.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                        <UserCheck className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {record.students.first_name} {record.students.last_name}
                        </p>
                        <p className="text-xs text-gray-500">
                          ID: {record.students.school_id}
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