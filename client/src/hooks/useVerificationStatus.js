import { useCallback, useEffect, useState } from 'react'
import api from '../services/api'

export default function useVerificationStatus() {
  const [verificationStatus, setVerificationStatus] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true)
      const res = await api.get('/verification/status')
      setVerificationStatus(res.data)
    } catch {
      setVerificationStatus(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  const status = verificationStatus?.verification_status || 'unverified'
  const rejectionReason = verificationStatus?.rejection_reason || null

  return {
    verificationStatus: status,
    rejectionReason,
    isVerified: status === 'approved',
    isPending: status === 'pending',
    isRejected: status === 'rejected',
    isUnverified: status === 'unverified',
    loading,
    refresh: fetchStatus,
  }
}
