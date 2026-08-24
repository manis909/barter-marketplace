import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  Clock3,
  ShieldCheck,
  Sparkles,
  Upload,
  Video,
  X
} from 'lucide-react'
import { useAuth } from '../features/auth/AuthContext'
import api from '../services/api'
import { getProviderRequests, acceptSkillRequest, rejectSkillRequest } from '../services/skillProviderRequestService'
import './MySkillsPage.css'

const SECTION_ORDER = [
  'profile',
  'about',
  'skill',
  'demo',
  'certificates',
  'teaching',
  'agreement'
]

const sectionMeta = {
  profile: { title: 'Profile Verification' },
  about: { title: 'About You' },
  skill: { title: 'Your Skill' },
  demo: { title: 'Skill Demonstration' },
  certificates: { title: 'Certificates & Achievements' },
  teaching: { title: 'Teaching Details' },
  agreement: { title: 'Agreement & Submission' }
}
const emptyDraft = {
  skill_name: '',
  category: '',
  about_you: '',
  skill_description: '',
  experience_level: '',
  teaching_mode: '',
  teaching_language: '',
  session_duration: '',
  teaching_description: '',
  agreement_accepted: false,
  availability: '',
  certificate_files: []
}

const MAX_DEMO_VIDEO_SIZE = 50 * 1024 * 1024
const MAX_DEMO_VIDEO_SECONDS = 300

export default function SkillProviderApplication() {
  const { currentUser, loading } = useAuth()
  const fileInputRef = useRef(null)
  const certificateInputRef = useRef(null)
  const [applications, setApplications] = useState([])
  const [applicationStatus, setApplicationStatus] = useState('no_application')
  const [selectedApplication, setSelectedApplication] = useState(null)
  const [openSection, setOpenSection] = useState('profile')
  const [draft, setDraft] = useState(emptyDraft)
  const [selectedApplicationId, setSelectedApplicationId] = useState(null)
  const [demoVideo, setDemoVideo] = useState(null)
  const [certificateFiles, setCertificateFiles] = useState([])
  const [demoVideoLoading, setDemoVideoLoading] = useState(false)
  const [demoUploadError, setDemoUploadError] = useState('')
  const [agreementError, setAgreementError] = useState('')
  const [certificateUploadError, setCertificateUploadError] = useState('')
  const [demoUploadProgress, setDemoUploadProgress] = useState(0)
  const [certificateUploadProgress, setCertificateUploadProgress] = useState(0)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [saveError, setSaveError] = useState('')
  const [learnerRequests, setLearnerRequests] = useState([])
  const [requestsLoading, setRequestsLoading] = useState(false)

  const hydrateApplication = async (application) => {
    if (!application) {
      setSelectedApplication(null)
      setSelectedApplicationId(null)
      setDemoVideo(null)
      setCertificateFiles([])
      setApplicationStatus('no_application')
      return
    }

    const nextCertificateFiles = Array.isArray(application.certificate_files) ? application.certificate_files : []
    setSelectedApplication(application)
    setSelectedApplicationId(application.id)
    setDraft({
      skill_name: application.skill_name || '',
      category: application.category || '',
      about_you: application.about_you || '',
      skill_description: application.skill_description || '',
      experience_level: application.experience_level || '',
      teaching_mode: application.teaching_mode || '',
      teaching_language: application.teaching_language || '',
      session_duration: application.session_duration || '',
      teaching_description: application.teaching_description || '',
      agreement_accepted: Boolean(application.agreement_accepted),
      availability: application.availability || '',
      certificate_files: nextCertificateFiles
    })
    setCertificateFiles(nextCertificateFiles)
    setApplicationStatus(application.status || 'draft')

    if (application.demo_video_path) {
      try {
        const videoRes = await api.get(`/skill-provider-applications/${application.id}/demo-video`)
        setDemoVideo(videoRes.data?.video || null)
      } catch (error) {
        console.error('Could not load demo video:', error)
        setDemoVideo(null)
      }
    } else {
      setDemoVideo(null)
    }

    setOpenSection('about')
  }

  const loadApplications = async () => {
    if (!currentUser) return

    try {
      const res = await api.get('/skill-provider-applications/mine')
      const nextApplications = Array.isArray(res.data?.applications) ? res.data.applications : []
      setApplications(nextApplications)

      if (nextApplications.length > 0) {
        const preferredApplication = nextApplications.find((application) => application.id === selectedApplicationId) || nextApplications[0]
        await hydrateApplication(preferredApplication)
        return
      }
    } catch (error) {
      console.error('Could not load draft status:', error)
    }

    setApplications([])
    setSelectedApplication(null)
    setSelectedApplicationId(null)
    setDemoVideo(null)
    setCertificateFiles([])
    setApplicationStatus('no_application')
  }

  useEffect(() => {
    if (!currentUser) return
    loadApplications()
  }, [currentUser])

  // Fetch learner requests for approved skills
  useEffect(() => {
    if (!currentUser) return

    const fetchRequests = async () => {
      try {
        setRequestsLoading(true)
        const response = await getProviderRequests()
        setLearnerRequests(response.requests || [])
      } catch (err) {
        console.error('Failed to fetch learner requests:', err)
      } finally {
        setRequestsLoading(false)
      }
    }

    fetchRequests()
  }, [currentUser])

  const profileVerified = Boolean(currentUser?.is_verified)
  const completedCount = useMemo(() => {
    let count = 0
    if (profileVerified) count += 1
    if (draft.skill_name?.trim()) count += 1
    if (draft.about_you?.trim()) count += 1
    if (demoVideo?.url) count += 1
    if (
      draft.teaching_mode?.trim() &&
      draft.teaching_language?.trim() &&
      draft.session_duration?.trim() &&
      draft.teaching_description?.trim()
    ) {
      count += 1
    }
    if (certificateFiles.length > 0) {
      count += 1
    }
    return count
  }, [profileVerified, draft, demoVideo, certificateFiles])

  const getSectionStatus = (sectionId) => {
    if (sectionId === 'profile') return profileVerified ? 'completed' : 'not-started'
    if (sectionId === 'about') return draft.about_you?.trim() ? 'completed' : 'not-started'
    if (sectionId === 'skill') return draft.skill_name?.trim() ? 'completed' : 'not-started'
    if (sectionId === 'demo') return demoVideo?.url ? 'completed' : 'not-started'
    if (sectionId === 'certificates') return certificateFiles.length > 0 ? 'completed' : 'not-started'
    if (sectionId === 'teaching') {
      return (
        draft.teaching_mode?.trim() &&
        draft.teaching_language?.trim() &&
        draft.session_duration?.trim() &&
        draft.teaching_description?.trim()
      )
        ? 'completed'
        : 'not-started'
    }
    if (sectionId === 'agreement') return draft.agreement_accepted ? 'completed' : 'not-started'
    return 'not-started'
  }

  const sections = SECTION_ORDER.map((sectionId) => ({
    id: sectionId,
    title: sectionMeta[sectionId].title,
    status: getSectionStatus(sectionId)
  }))

  const handleFieldChange = (field, value) => {
    if (['under_review', 'approved', 'rejected', 'suspended'].includes(applicationStatus)) {
      return
    }

    setDraft((previous) => ({ ...previous, [field]: value }))
    setSaveMessage('')
    setSaveError('')
  }

  const handleSelectApplication = async (applicationId) => {
    if (!applicationId) return

    const nextApplication = applications.find((application) => application.id === applicationId)
    if (!nextApplication) return

    await hydrateApplication(nextApplication)
  }

  const validateDemoVideoFile = (file) => {
    if (!file) return ''

    const allowedTypes = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-matroska']
    const allowedExtensions = ['.mp4', '.mov', '.webm', '.mkv']
    const fileName = file.name || ''
    const extension = fileName.includes('.') ? fileName.slice(fileName.lastIndexOf('.')).toLowerCase() : ''

    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(extension)) {
      return 'Unsupported video format. Please upload MP4, MOV, or WEBM.'
    }

    if (file.size > MAX_DEMO_VIDEO_SIZE) {
      return 'Video must be 100 MB or smaller.'
    }

    return ''
  }

  const handleDemoSelection = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    const validationError = validateDemoVideoFile(file)
    if (validationError) {
      setDemoUploadError(validationError)
      event.target.value = ''
      return
    }

    const videoUrl = URL.createObjectURL(file)
    const tempVideo = document.createElement('video')
    tempVideo.preload = 'metadata'
    tempVideo.onloadedmetadata = () => {
      if (tempVideo.duration > MAX_DEMO_VIDEO_SECONDS) {
        URL.revokeObjectURL(videoUrl)
        setDemoUploadError('Demo videos must be 5 minutes or shorter.')
        event.target.value = ''
        return
      }

      setDemoUploadError('')
      setDemoVideo({
        id: Date.now(),
        name: file.name,
        size: file.size,
        duration: tempVideo.duration,
        url: videoUrl,
        file
      })
    }
    tempVideo.onerror = () => {
      URL.revokeObjectURL(videoUrl)
      setDemoUploadError('This video could not be read. Please try another file.')
      event.target.value = ''
    }
    tempVideo.src = videoUrl
  }

  const handleCertificateSelection = async (event) => {
    const files = Array.from(event.target.files || [])
    if (files.length === 0) return

    if (certificateFiles.length + files.length > 5) {
      setCertificateUploadError('You can upload up to 5 certificates/proof files.')
      event.target.value = ''
      return
    }

    const invalidFile = files.find((file) => {
      const extension = file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.')).toLowerCase() : ''
      const type = file.type.toLowerCase()
      return !['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(type)
        && !['.pdf', '.jpg', '.jpeg', '.png', '.webp'].includes(extension)
    })

    const oversizedFile = files.find((file) => {
      const extension = file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.')).toLowerCase() : ''
      const type = file.type.toLowerCase()
      const isPdf = type === 'application/pdf' || extension === '.pdf'
      const limit = isPdf ? 10 * 1024 * 1024 : 5 * 1024 * 1024
      return file.size > limit
    })

    if (invalidFile) {
      setCertificateUploadError('Unsupported file type. Please upload PDF, JPG, PNG, or WEBP files.')
      event.target.value = ''
      return
    }

    if (oversizedFile) {
      setCertificateUploadError('PDF files must be 10 MB or smaller, and image files must be 5 MB or smaller.')
      event.target.value = ''
      return
    }

    setCertificateUploadError('')
    setCertificateUploadProgress(0)

    let appId = selectedApplicationId
    if (!appId) {
      if (!draft.skill_name?.trim()) {
        setCertificateUploadError('Please provide a Skill Name under the "Your Skill" section before saving/uploading certificates.')
        setOpenSection('skill')
        return
      }

      try {
        const payload = {
          ...draft,
          teaching_mode: draft.teaching_mode || '',
          teaching_language: draft.teaching_language || '',
          session_duration: draft.session_duration || '',
          teaching_description: draft.teaching_description || '',
          agreement_accepted: Boolean(draft.agreement_accepted),
          certificate_files: certificateFiles,
          status: 'draft'
        }

        const response = await api.post('/skill-provider-applications/draft', payload)
        const application = response.data?.application
        if (application) {
          appId = application.id
          setApplicationStatus(application.status || 'draft')
          setSelectedApplicationId(application.id)
          setSelectedApplication(application)
          setApplications(prev => {
            const index = prev.findIndex(a => a.id === application.id)
            if (index !== -1) {
              const next = [...prev]
              next[index] = application
              return next
            }
            return [application, ...prev]
          })
        }
      } catch (error) {
        setCertificateUploadError(error.response?.data?.error || 'Failed to automatically save draft application.')
        return
      }
    }

    const formData = new FormData()
    files.forEach((file) => formData.append('files', file))

    try {
      const response = await api.post(`/skill-provider-applications/${appId}/certificates`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            setCertificateUploadProgress(Math.round((progressEvent.loaded / progressEvent.total) * 100))
          }
        }
      })

      setCertificateFiles(response.data?.files || [])
      setDraft((previous) => ({ ...previous, certificate_files: response.data?.files || [] }))
      setSaveMessage('Certificates saved to this application.')
      setCertificateUploadProgress(100)
      event.target.value = ''
      await loadApplications()
    } catch (error) {
      setCertificateUploadError(error.response?.data?.error || 'Your certificate files could not be uploaded.')
    }
  }

  const handleRemoveCertificate = async (filePath) => {
    if (!selectedApplicationId) return

    try {
      const response = await api.delete(`/skill-provider-applications/${selectedApplicationId}/certificates`, {
        data: { file_path: filePath }
      })

      const updatedFiles = response.data?.files || []
      setCertificateFiles(updatedFiles)
      setDraft((previous) => ({ ...previous, certificate_files: updatedFiles }))
      setSaveMessage('Certificate removed.')
      setCertificateUploadError('')
    } catch (error) {
      setCertificateUploadError(error.response?.data?.error || 'This certificate could not be removed.')
    }
  }

  const handleDemoUpload = async () => {
    let appId = selectedApplicationId
    if (!appId) {
      if (!draft.skill_name?.trim()) {
        setDemoUploadError('Please provide a Skill Name under the "Your Skill" section before saving/uploading the demo video.')
        setOpenSection('skill')
        return
      }

      try {
        const payload = {
          ...draft,
          teaching_mode: draft.teaching_mode || '',
          teaching_language: draft.teaching_language || '',
          session_duration: draft.session_duration || '',
          teaching_description: draft.teaching_description || '',
          agreement_accepted: Boolean(draft.agreement_accepted),
          certificate_files: certificateFiles,
          status: 'draft'
        }

        const response = await api.post('/skill-provider-applications/draft', payload)
        const application = response.data?.application
        if (application) {
          appId = application.id
          setApplicationStatus(application.status || 'draft')
          setSelectedApplicationId(application.id)
          setSelectedApplication(application)
          setApplications(prev => {
            const index = prev.findIndex(a => a.id === application.id)
            if (index !== -1) {
              const next = [...prev]
              next[index] = application
              return next
            }
            return [application, ...prev]
          })
        }
      } catch (error) {
        setDemoUploadError(error.response?.data?.error || 'Failed to automatically save draft application.')
        return
      }
    }

    if (!appId || !demoVideo?.file) {
      setDemoUploadError('Select or save a skill application before uploading a demo video.')
      return
    }

    setDemoUploadError('')
    setDemoVideoLoading(true)
    setDemoUploadProgress(0)

    try {
      const formData = new FormData()
      formData.append('demo_video', demoVideo.file)

      const response = await api.post(`/skill-provider-applications/${appId}/demo-video`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (event) => {
          if (event.total) {
            setDemoUploadProgress(Math.round((event.loaded / event.total) * 100))
          }
        }
      })

      const uploaded = response.data?.video
      setDemoVideo(uploaded || demoVideo)
      setDemoUploadProgress(100)
      setSaveMessage('Demo video saved to this skill application.')
      await loadApplications()
    } catch (error) {
      setDemoUploadError(error.response?.data?.error || 'Your demo video could not be uploaded.')
    } finally {
      setDemoVideoLoading(false)
    }
  }

  const handleRemoveDemoVideo = async () => {
    if (!selectedApplicationId) return

    try {
      await api.delete(`/skill-provider-applications/${selectedApplicationId}/demo-video`)
      setDemoVideo(null)
      setDemoUploadError('')
      setSaveMessage('Demo video removed from this application.')
      await loadApplications()
    } catch (error) {
      setDemoUploadError(error.response?.data?.error || 'Unable to remove the demo video.')
    }
  }

  const handleTeachingModeToggle = (option) => {
    const currentModes = (draft.teaching_mode || '')
      .split(',')
      .map((mode) => mode.trim().toLowerCase())
      .filter(Boolean)

    const nextModes = currentModes.includes(option)
      ? currentModes.filter((mode) => mode !== option)
      : [...currentModes, option]

    setDraft((previous) => ({
      ...previous,
      teaching_mode: nextModes.join(',')
    }))
    setSaveMessage('')
    setSaveError('')
  }

  const handleSaveDraft = async () => {
    if (!currentUser) return
    if (!draft.skill_name?.trim()) {
      setSaveError('Add a skill name before saving your draft.')
      setOpenSection('skill')
      return
    }

    setIsSaving(true)
    setSaveError('')
    setSaveMessage('')

    try {
      const payload = {
        ...draft,
        teaching_mode: draft.teaching_mode || '',
        teaching_language: draft.teaching_language || '',
        session_duration: draft.session_duration || '',
        teaching_description: draft.teaching_description || '',
        agreement_accepted: Boolean(draft.agreement_accepted),
        certificate_files: certificateFiles,
        status: 'draft'
      }

      const response = await api.post('/skill-provider-applications/draft', payload)
      const application = response.data?.application
      if (application) {
        setApplicationStatus(application.status || 'draft')
        setSelectedApplicationId(application.id)
        setSelectedApplication(application)
        setApplications(prev => {
          const index = prev.findIndex(a => a.id === application.id)
          if (index !== -1) {
            const next = [...prev]
            next[index] = application
            return next
          }
          return [application, ...prev]
        })
      }
      setSaveMessage('Draft saved successfully.')
    } catch (error) {
      setSaveError(error.response?.data?.error || 'Your draft could not be saved.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSubmitApplication = async () => {
    if (!selectedApplicationId) {
      setAgreementError('Create or save your skill application before submitting.')
      setOpenSection('skill')
      return
    }

    const requiredChecks = [
      { key: 'profile', valid: profileVerified, label: 'Profile Verification' },
      { key: 'about', valid: Boolean(draft.about_you?.trim()), label: 'About You' },
      { key: 'skill', valid: Boolean(draft.skill_name?.trim()), label: 'Your Skill' },
      { key: 'demo', valid: Boolean(demoVideo?.url), label: 'Skill Demonstration' },
      { key: 'teaching', valid: Boolean(draft.teaching_mode?.trim() && draft.teaching_language?.trim() && draft.session_duration?.trim() && draft.teaching_description?.trim()), label: 'Teaching Details' }
    ]

    const missing = requiredChecks.filter((item) => !item.valid)
    if (missing.length > 0) {
      setAgreementError(`Please complete the missing required section: ${missing[0].label}.`)
      setOpenSection(missing[0].key)
      return
    }

    if (!draft.agreement_accepted) {
      setAgreementError('Please read the agreement and accept it before submitting.')
      setOpenSection('agreement')
      return
    }

    setAgreementError('')
    setIsSaving(true)

    try {
      const savePayload = {
        ...draft,
        teaching_mode: draft.teaching_mode || '',
        teaching_language: draft.teaching_language || '',
        session_duration: draft.session_duration || '',
        teaching_description: draft.teaching_description || '',
        agreement_accepted: Boolean(draft.agreement_accepted),
        certificate_files: certificateFiles,
        status: 'draft'
      }

      await api.post('/skill-provider-applications/draft', savePayload)

      const response = await api.post(`/skill-provider-applications/${selectedApplicationId}/submit`, {
        agreement_accepted: true
      })

      const application = response.data?.application
      if (application) {
        setApplicationStatus(application.status || 'under_review')
        setDraft((previous) => ({
          ...previous,
          agreement_accepted: true
        }))
      }

      setSaveMessage('Application submitted')
      setSaveError('')
      await loadApplications()
    } catch (error) {
      setAgreementError(error.response?.data?.error || 'Your application could not be submitted.')
      setOpenSection('agreement')
    } finally {
      setIsSaving(false)
    }
  }

  const handleStartVerification = () => {
    setApplicationStatus('draft')
    setOpenSection('profile')
  }

  if (loading) {
    return (
      <section className="my-skills-page">
        <div className="skill-provider-shell skill-provider-shell--loading">
          <p>Loading...</p>
        </div>
      </section>
    )
  }

  if (!currentUser) {
    return (
      <section className="my-skills-page">
        <div className="skill-provider-shell">
          <div className="provider-state-card provider-state-card--empty">
            <p className="page-label">My Skills</p>
            <h1>Please log in</h1>
            <p>Sign in to continue with Skill Provider onboarding.</p>
          </div>
        </div>
      </section>
    )
  }

  const introName = currentUser.full_name?.split(' ')[0] || 'there'
  const hasApprovedApplication = applications.some((application) => application.status === 'approved')
  const dashboardApplications = [...applications].sort((a, b) => (new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0)))
  const draftApplications = dashboardApplications.filter((application) => application.status === 'draft')
  const underReviewApplications = dashboardApplications.filter((application) => application.status === 'under_review')
  const changesRequestedApplications = dashboardApplications.filter((application) => application.status === 'changes_requested')
  const approvedApplications = dashboardApplications.filter((application) => application.status === 'approved')
  const isReadOnlyStatus = ['under_review', 'approved', 'rejected', 'suspended'].includes(applicationStatus)
  const canResubmitChanges = applicationStatus === 'changes_requested'
  const shouldShowApplicationForm = ['draft', 'changes_requested'].includes(applicationStatus)
  const getStatusText = (status) => {
    switch (status) {
      case 'approved': return 'Approved'
      case 'under_review': return 'Under Review'
      case 'changes_requested': return 'Changes Requested'
      case 'draft': return 'Draft'
      case 'rejected': return 'Rejected'
      case 'suspended': return 'Suspended'
      default: return 'Draft'
    }
  }

  const getStatusVariant = (status) => {
    switch (status) {
      case 'approved': return 'success'
      case 'under_review': return 'muted'
      case 'changes_requested': return 'warning'
      case 'draft': return 'neutral'
      case 'rejected': return 'danger'
      case 'suspended': return 'danger'
      default: return 'neutral'
    }
  }

  const statusBanner = (() => {
    switch (applicationStatus) {
      case 'under_review':
        return {
          label: 'Verification Under Review',
          title: 'Verification Under Review',
          message: 'Your Skill Provider application has been submitted and is currently being reviewed.',
          tone: 'muted'
        }
      case 'changes_requested':
        return {
          label: 'Changes Requested',
          title: 'Changes Requested',
          message: selectedApplication?.changes_reason || 'Your application needs a few updates before it can be re-submitted.',
          tone: 'warning'
        }
      case 'rejected':
        return {
          label: 'Application Not Approved',
          title: 'Application Not Approved',
          message: selectedApplication?.rejection_reason || 'Your application was not approved for the current review.',
          tone: 'danger'
        }
      case 'suspended':
        return {
          label: 'Access Restricted',
          title: 'Skill Provider Access Restricted',
          message: 'This Skill Provider application has been restricted and can no longer be edited or re-submitted.',
          tone: 'danger'
        }
      default:
        return null
    }
  })()

  return (
    <section className="my-skills-page">
      <div className="skill-provider-shell">
        <div className="provider-header">
          <div>
            <p className="page-label">My Skills</p>
            <h1>Skill Provider Profile</h1>
          </div>
          <span className="provider-progress-pill">
            {completedCount} of {sections.length} sections completed
          </span>
        </div>

        {applications.length > 1 && (
          <div className="provider-application-picker">
            {applications.map((application) => (
              <button
                key={application.id}
                type="button"
                className={`provider-application-chip ${selectedApplicationId === application.id ? 'is-selected' : ''}`}
                onClick={() => handleSelectApplication(application.id)}
              >
                <span>{application.skill_name || 'Untitled skill'}</span>
                <small>{application.status || 'draft'}</small>
              </button>
            ))}
          </div>
        )}

        {applicationStatus === 'no_application' && (
          <div className="provider-state-card provider-welcome-card">
            <h2>Hi, {introName}!</h2>
            <h3>Become a Verified Skill Provider</h3>
            <p>
              Share your skills with the Barter community and help others learn from you.
            </p>
            <p className="provider-subtle-copy">
              To keep our learning community safe and trustworthy, Barter verifies every skill provider before they can offer a skill.
            </p>

            <div className="provider-info-row">
              <Clock3 size={16} />
              <span>Estimated time: 5ΓÇô10 minutes</span>
            </div>

            <div className="provider-checklist">
              <p>You&apos;ll need:</p>
              <ul>
                <li>Profile verification</li>
                <li>About you</li>
                <li>Your skill details</li>
                <li>A short demonstration</li>
                <li>Teaching details</li>
              </ul>
            </div>

            <button type="button" className="primary-button" onClick={handleStartVerification}>
              Start Application
            </button>
          </div>
        )}

        {(applicationStatus === 'draft' || applicationStatus === 'under_review' || applicationStatus === 'changes_requested' || applicationStatus === 'rejected' || applicationStatus === 'approved' || applicationStatus === 'suspended') && (
          <div className="provider-state-card provider-state-card--compact">
            {applicationStatus === 'draft' && (
              <>
                <p className="provider-status-tag">Draft</p>
                <h2>Continue your Skill Provider application</h2>
                <button type="button" className="primary-button" onClick={() => setOpenSection('about')}>
                  Continue Application
                </button>
              </>
            )}

            {applicationStatus === 'under_review' && (
              <>
                <p className="provider-status-tag provider-status-tag--muted">Under Review</p>
                <h2>Verification Under Review</h2>
                <p className="provider-body-copy">Your Skill Provider application has been submitted and is currently being reviewed.</p>
                {selectedApplication?.submitted_at && (
                  <p className="provider-body-copy provider-body-copy--muted">
                    Submitted: {new Date(selectedApplication.submitted_at).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </p>
                )}
              </>
            )}

            {applicationStatus === 'changes_requested' && (
              <>
                <p className="provider-status-tag provider-status-tag--warning">Changes Requested</p>
                <h2>Changes Requested</h2>
                <p className="provider-body-copy">{selectedApplication?.changes_reason || 'Please update the required details and resubmit.'}</p>
                <button type="button" className="secondary-button" onClick={() => setOpenSection('about')}>
                  Review & Update
                </button>
              </>
            )}

            {applicationStatus === 'rejected' && (
              <>
                <p className="provider-status-tag provider-status-tag--danger">Rejected</p>
                <h2>Application Not Approved</h2>
                <p className="provider-body-copy">{selectedApplication?.rejection_reason || 'Your application was not approved for the current review.'}</p>
                <button type="button" className="secondary-button" onClick={() => setOpenSection('about')}>
                  Review Application
                </button>
              </>
            )}

            {applicationStatus === 'approved' && (
              <>
                <p className="provider-status-tag provider-status-tag--success">Approved</p>
                <h2>You&apos;re a Verified Skill Provider</h2>
                <p className="provider-body-copy">Your skill has been approved. You can now continue to the Skill Provider experience.</p>
                <Link to="/skilter/skills" className="primary-button">
                  Continue to Skills
                </Link>
              </>
            )}

            {applicationStatus === 'suspended' && (
              <>
                <p className="provider-status-tag provider-status-tag--danger">Suspended</p>
                <h2>Skill Provider Access Restricted</h2>
                <p className="provider-body-copy">This Skill Provider application has been restricted and cannot be edited or submitted.</p>
              </>
            )}
          </div>
        )}

        {statusBanner && (
          <div className={`provider-status-banner provider-status-banner--${statusBanner.tone}`}>
            <div className="provider-status-banner__header">
              <span className="provider-status-tag provider-status-tag--muted">{statusBanner.label}</span>
            </div>
            <h3>{statusBanner.title}</h3>
            <p>{statusBanner.message}</p>
          </div>
        )}

        {hasApprovedApplication && applicationStatus !== 'approved' && (
          <div className="provider-dashboard">
            <div className="provider-dashboard__header">
              <div>
                <p className="page-label">My Skills</p>
                <h2>Skill Provider Dashboard</h2>
                <p>Manage your skills and teaching profile.</p>
              </div>
              <span className="provider-status-tag provider-status-tag--success">Γ£ô Verified Skill Provider</span>
            </div>

            <div className="provider-dashboard__stats">
              <div className="provider-dashboard-stat">
                <span>Draft</span>
                <strong>{draftApplications.length}</strong>
              </div>
              <div className="provider-dashboard-stat">
                <span>Under Review</span>
                <strong>{underReviewApplications.length}</strong>
              </div>
              <div className="provider-dashboard-stat">
                <span>Changes Requested</span>
                <strong>{changesRequestedApplications.length}</strong>
              </div>
              <div className="provider-dashboard-stat">
                <span>Approved</span>
                <strong>{approvedApplications.length}</strong>
              </div>
            </div>

            <div className="provider-dashboard__section">
              <div className="provider-dashboard__section-header">
                <h3>My Skills</h3>
                <button
                  type="button"
                  className="primary-button provider-dashboard-button"
                  onClick={() => {
                    setSelectedApplication(null)
                    setSelectedApplicationId(null)
                    setDraft(emptyDraft)
                    setDemoVideo(null)
                    setCertificateFiles([])
                    setApplicationStatus('draft')
                    setOpenSection('skill')
                  }}
                >
                  + Add Another Skill
                </button>
              </div>

              <div className="provider-dashboard__cards">
                {dashboardApplications.map((application) => (
                  <div key={application.id} className="provider-dashboard-card">
                    <div className="provider-dashboard-card__top">
                      <div>
                        <h4>{application.skill_name || 'Untitled Skill'}</h4>
                        <p>{application.category || 'Category not set'}</p>
                      </div>
                      <span className={`provider-status-badge provider-status-badge--${getStatusVariant(application.status || 'draft')}`}>
                        {application.status === 'approved' ? 'Γ£ô Approved' : application.status === 'under_review' ? '≡ƒƒí Under Review' : application.status === 'changes_requested' ? '≡ƒƒá Changes Requested' : 'Draft'}
                      </span>
                    </div>

                    <div className="provider-dashboard-card__details">
                      <span>Level: {application.experience_level || 'Not set'}</span>
                      <span>Mode: {application.teaching_mode || 'Not set'}</span>
                    </div>

                    <button type="button" className="secondary-button provider-dashboard-card__button" onClick={() => handleSelectApplication(application.id)}>
                      {application.status === 'approved' ? 'View' : 'Edit/View'}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="provider-dashboard__section">
              <div className="provider-dashboard__section-header">
                <h3>Applications</h3>
              </div>

              <div className="provider-dashboard__application-list">
                {dashboardApplications.map((application) => (
                  <button
                    key={application.id}
                    type="button"
                    className="provider-dashboard-application-row"
                    onClick={() => handleSelectApplication(application.id)}
                  >
                    <span>{application.skill_name || 'Untitled Skill'}</span>
                    <small>{getStatusText(application.status || 'draft')}</small>
                  </button>
                ))}
              </div>
            </div>

            {/* Learner Requests Section */}
            <div className="provider-dashboard__section">
              <div className="provider-dashboard__section-header">
                <h3>Learner Requests</h3>
                <span style={{ fontSize: '0.85rem', color: '#7B766D', fontWeight: 600 }}>
                  {learnerRequests.filter(r => r.status === 'pending').length} Pending
                </span>
              </div>

              {requestsLoading ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#5F5B52' }}>
                  Loading requests...
                </div>
              ) : learnerRequests.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#5F5B52' }}>
                  No learner requests yet.
                </div>
              ) : (
                <div className="provider-requests-list">
                  {learnerRequests.map((request) => (
                    <div key={request.id} className="provider-request-card">
                      <div className="request-card__header">
                        <div>
                          <h4 style={{ margin: 0 }}>{request.learner_full_name || request.learner_name}</h4>
                          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#5F5B52' }}>
                            {request.skill_name}
                          </p>
                        </div>
                        <span className={`request-status-badge request-status-badge--${request.status}`}>
                          {request.status}
                        </span>
                      </div>
                      <div className="request-card__details">
                        <span>≡ƒôà {new Date(request.preferred_date).toLocaleDateString()}</span>
                        {request.preferred_time && <span>ΓÅ░ {request.preferred_time}</span>}
                        {request.teaching_mode && <span>≡ƒÄô {request.teaching_mode}</span>}
                      </div>
                      {request.message && (
                        <div className="request-card__message">
                          <p style={{ margin: 0, fontSize: '0.9rem', color: '#3D3A36', fontStyle: 'italic' }}>
                            "{request.message}"
                          </p>
                        </div>
                      )}
                      {request.status === 'pending' && (
                        <div className="request-card__actions">
                          <button
                            type="button"
                            className="secondary-button"
                            style={{ flex: 1 }}
                            onClick={async () => {
                              try {
                                await rejectSkillRequest(request.id)
                                // Refresh requests
                                const response = await getProviderRequests()
                                setLearnerRequests(response.requests || [])
                              } catch (err) {
                                console.error('Failed to reject request:', err)
                              }
                            }}
                          >
                            Reject
                          </button>
                          <button
                            type="button"
                            className="primary-button"
                            style={{ flex: 1, background: '#196D3C' }}
                            onClick={async () => {
                              try {
                                await acceptSkillRequest(request.id)
                                // Refresh requests
                                const response = await getProviderRequests()
                                setLearnerRequests(response.requests || [])
                              } catch (err) {
                                console.error('Failed to accept request:', err)
                              }
                            }}
                          >
                            Accept
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="provider-dashboard__placeholders">
              <div className="provider-placeholder-card">
                <h4>Reviews</h4>
                <p>Placeholder for skill reviews and feedback.</p>
              </div>
            </div>
          </div>
        )}

        {shouldShowApplicationForm && (
          <div className="provider-section-list">
            {sections.map((section) => {
              const isOpen = openSection === section.id
              const isComplete = section.status === 'completed'
              const isInProgress = section.status === 'in_progress'

              return (
                <div key={section.id} className={`provider-section ${isOpen ? 'is-open' : ''}`}>
                  <button
                    type="button"
                    className="provider-section__header"
                    onClick={() => setOpenSection(isOpen ? null : section.id)}
                    aria-expanded={isOpen}
                  >
                    <div className="provider-section__title-wrap">
                      <span className={`provider-section__status provider-section__status--${section.status}`}>
                        {isComplete ? <CheckCircle2 size={18} /> : isInProgress ? <Sparkles size={18} /> : <Circle size={18} />}
                      </span>
                      <span className="provider-section__label">{section.title}</span>
                    </div>
                    <span className="provider-section__chevron">
                      {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="provider-section__body">
                      {section.id === 'profile' && !profileVerified && (
                        <>
                          <p className="provider-body-title">Profile Verification</p>
                          <p className="provider-body-copy">
                            Before becoming a Skill Provider, please verify your Barter profile using your college ID.
                          </p>
                          <p className="provider-body-copy provider-body-copy--muted">
                            This is required before submitting your Skill Provider application.
                          </p>
                          <Link to="/verify-id" className="primary-button provider-action-button">
                            Verify Profile
                          </Link>
                        </>
                      )}

                      {section.id === 'profile' && profileVerified && (
                        <>
                          <p className="provider-body-title provider-body-title--success">
                            <ShieldCheck size={18} />
                            Profile Verified
                          </p>
                          <p className="provider-body-copy">
                            Your Barter profile identity has already been verified.
                          </p>
                        </>
                      )}

                      {section.id === 'about' && (
                        <div className="provider-form-grid">
                          <div className="provider-field provider-field--full">
                            <label htmlFor="full-name">Full name</label>
                            <input id="full-name" type="text" value={currentUser.full_name || ''} readOnly />
                          </div>

                          <div className="provider-field provider-field--full">
                            <label htmlFor="about-you">Tell us about yourself</label>
                            <textarea
                              id="about-you"
                              value={draft.about_you}
                              onChange={(event) => handleFieldChange('about_you', event.target.value)}
                              placeholder="Share your background, teaching style, and what makes you a good mentor."
                              rows={5}
                              readOnly={isReadOnlyStatus}
                            />
                          </div>
                        </div>
                      )}

                      {section.id === 'skill' && (
                        <div className="provider-form-grid">
                          <div className="provider-field provider-field--full">
                            <label htmlFor="skill-name">Skill name</label>
                            <input
                              id="skill-name"
                              type="text"
                              value={draft.skill_name}
                              onChange={(event) => handleFieldChange('skill_name', event.target.value)}
                              placeholder="Ex: Guitar Basics for Beginners"
                              readOnly={isReadOnlyStatus}
                            />
                          </div>

                          <div className="provider-field">
                            <label htmlFor="category">Category</label>
                            <select
                              id="category"
                              value={draft.category}
                              onChange={(event) => handleFieldChange('category', event.target.value)}
                              disabled={isReadOnlyStatus}
                            >
                              <option value="">Select a category</option>
                              <option value="Music">Music</option>
                              <option value="Dance">Dance</option>
                              <option value="Art & Design">Art & Design</option>
                              <option value="Study Help / Tutoring">Study Help / Tutoring</option>
                              <option value="Coding & Tech">Coding & Tech</option>
                              <option value="Languages">Languages</option>
                              <option value="Fitness & Sports">Fitness & Sports</option>
                              <option value="Photography & Videography">Photography & Videography</option>
                            </select>
                          </div>

                          <div className="provider-field">
                            <label htmlFor="experience-level">Experience level</label>
                            <select
                              id="experience-level"
                              value={draft.experience_level}
                              onChange={(event) => handleFieldChange('experience_level', event.target.value)}
                              disabled={isReadOnlyStatus}
                            >
                              <option value="">Select level</option>
                              <option value="beginner">Beginner</option>
                              <option value="intermediate">Intermediate</option>
                              <option value="advanced">Advanced</option>
                              <option value="all levels">All levels</option>
                            </select>
                          </div>

                          <div className="provider-field provider-field--full">
                            <label htmlFor="skill-description">Describe the skill</label>
                            <textarea
                              id="skill-description"
                              value={draft.skill_description}
                              onChange={(event) => handleFieldChange('skill_description', event.target.value)}
                              placeholder="Explain what students will learn, the teaching approach, and any prerequisites."
                              rows={5}
                              readOnly={isReadOnlyStatus}
                            />
                          </div>

                          <div className="provider-field">
                            <label htmlFor="teaching-mode">Teaching mode</label>
                            <select
                              id="teaching-mode"
                              value={draft.teaching_mode}
                              onChange={(event) => handleFieldChange('teaching_mode', event.target.value)}
                            >
                              <option value="">Select mode</option>
                              <option value="online">Online</option>
                              <option value="in-person">In person</option>
                              <option value="online & in-person">Online & In person</option>
                            </select>
                          </div>

                          <div className="provider-field">
                            <label htmlFor="teaching-language">Teaching language</label>
                            <select
                              id="teaching-language"
                              value={draft.teaching_language}
                              onChange={(event) => handleFieldChange('teaching_language', event.target.value)}
                            >
                              <option value="">Select language</option>
                              <option value="english">English</option>
                              <option value="telugu">Telugu</option>
                              <option value="hindi">Hindi</option>
                              <option value="tamil">Tamil</option>
                              <option value="kannada">Kannada</option>
                              <option value="malayalam">Malayalam</option>
                              <option value="other">Other</option>
                            </select>
                          </div>

                          <div className="provider-field provider-field--full">
                            <label htmlFor="availability">Availability</label>
                            <input
                              id="availability"
                              type="text"
                              value={draft.availability}
                              onChange={(event) => handleFieldChange('availability', event.target.value)}
                              placeholder="Example: Weekdays evenings or weekends"
                              readOnly={isReadOnlyStatus}
                            />
                          </div>
                        </div>
                      )}

                      {section.id === 'demo' && (
                        <div className="provider-demo-section">
                          <div className="provider-demo-copy">
                            <p className="provider-body-title">Show us what you can do.</p>
                            <p className="provider-body-copy">
                              Upload a short video that demonstrates your knowledge, ability, or experience in the skill you want to teach.
                            </p>
                            <p className="provider-body-copy provider-body-copy--muted">
                              One demo video is required per skill application. We accept MP4, MOV, and WEBM files up to 50 MB and 5 minutes long.
                            </p>
                          </div>

                          <div className="provider-upload-card">
                            {demoVideo?.url ? (
                              <>
                                <div className="provider-video-preview">
                                  <video controls src={demoVideo.url} preload="metadata" />
                                </div>

                                <div className="provider-video-meta">
                                  <span>{demoVideo.name || 'Demo video'}</span>
                                  <span>
                                    {demoVideo.duration ? `${Math.round(demoVideo.duration / 60)} min` : 'Ready'}
                                    {' ΓÇó '}
                                    {demoVideo.size ? `${Math.max(1, Math.round(demoVideo.size / (1024 * 1024)))} MB` : ''}
                                  </span>
                                </div>

                                <div className="provider-upload-actions">
                                  <button type="button" className="secondary-button" onClick={() => fileInputRef.current?.click()}>
                                    Replace
                                  </button>
                                  <button type="button" className="secondary-button provider-remove-button" onClick={handleRemoveDemoVideo}>
                                    Remove
                                  </button>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="provider-upload-dropzone" onClick={() => fileInputRef.current?.click()}>
                                  <div className="provider-upload-icon"><Upload size={20} /></div>
                                  <p className="provider-upload-title">Upload a demo video</p>
                                  <p className="provider-upload-subtitle">MP4, MOV, or WEBM ┬╖ Max 50 MB ┬╖ 5 minutes</p>
                                </div>

                                <button type="button" className="primary-button provider-action-button" onClick={() => fileInputRef.current?.click()}>
                                  Choose Video
                                </button>
                              </>
                            )}

                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm,.mkv"
                              hidden
                              onChange={handleDemoSelection}
                            />

                            {demoUploadError && <p className="provider-upload-error">{demoUploadError}</p>}

                            {demoVideoLoading && (
                              <div className="provider-upload-progress">
                                <div className="provider-upload-progress-bar" style={{ width: `${demoUploadProgress}%` }} />
                              </div>
                            )}

                            {demoVideoLoading && (
                              <p className="provider-upload-status">UploadingΓÇª {demoUploadProgress}%</p>
                            )}

                            {demoVideo && !demoVideoLoading && (
                              <button type="button" className="primary-button provider-action-button" onClick={handleDemoUpload}>
                                Save Demo Video
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {section.id === 'certificates' && (
                        <div className="provider-certificate-section">
                          <div className="provider-demo-copy">
                            <p className="provider-body-title">Have something that supports your experience?</p>
                            <p className="provider-body-copy">
                              Certificates and achievements can help show your experience, but they are completely optional.
                            </p>
                          </div>

                          <div className="provider-upload-card provider-upload-card--compact">
                            <div className="provider-upload-dropzone provider-upload-dropzone--compact" onClick={() => certificateInputRef.current?.click()}>
                              <div className="provider-upload-icon"><Upload size={20} /></div>
                              <p className="provider-upload-title">Upload certificates or achievements</p>
                              <p className="provider-upload-subtitle">PDF, JPG, PNG, or WEBP ┬╖ Up to 10 MB per file</p>
                            </div>

                            <input
                              ref={certificateInputRef}
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png,.webp,image/png,image/jpeg,image/webp,application/pdf"
                              multiple
                              hidden
                              onChange={handleCertificateSelection}
                            />

                            {certificateUploadError && <p className="provider-upload-error">{certificateUploadError}</p>}

                            {certificateUploadProgress > 0 && certificateUploadProgress < 100 && (
                              <div className="provider-upload-progress">
                                <div className="provider-upload-progress-bar" style={{ width: `${certificateUploadProgress}%` }} />
                              </div>
                            )}

                            {certificateFiles.length > 0 && (
                              <div className="provider-certificate-list">
                                {certificateFiles.map((file) => (
                                  <div key={`${file.path || file.name}-${file.uploadedAt || file.name}`} className="provider-certificate-item">
                                    <div className="provider-certificate-info">
                                      <span className="provider-certificate-icon"><Video size={16} /></span>
                                      <div>
                                        <p>{file.name}</p>
                                        <small>{file.size ? `${Math.max(1, Math.round(file.size / 1024))} KB` : 'Attached'}</small>
                                      </div>
                                    </div>
                                    <button type="button" className="provider-remove-file-btn" onClick={() => handleRemoveCertificate(file.path)}>
                                      <X size={14} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}

                            <p className="provider-body-copy provider-body-copy--muted">
                              Optional: you can save and continue without uploading anything.
                            </p>
                          </div>
                        </div>
                      )}

                      {section.id === 'teaching' && (
                        <div className="provider-form-grid provider-form-grid--stacked">
                          <div className="provider-field provider-field--full">
                            <label>Teaching mode</label>
                            <div className="provider-toggle-list">
                              {['online', 'offline'].map((option) => {
                                const checked = (draft.teaching_mode || '')
                                  .split(',')
                                  .map((mode) => mode.trim().toLowerCase())
                                  .includes(option)

                                return (
                                  <label key={option} className={`provider-mode-option ${checked ? 'is-selected' : ''}`}>
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => handleTeachingModeToggle(option)}
                                    />
                                    <span>{option === 'online' ? 'Online' : 'Offline'}</span>
                                  </label>
                                )
                              })}
                            </div>
                          </div>

                          <div className="provider-field provider-field--full">
                            <label htmlFor="teaching-language">Teaching language</label>
                            <input
                              id="teaching-language"
                              type="text"
                              list="language-options"
                              value={draft.teaching_language}
                              onChange={(event) => handleFieldChange('teaching_language', event.target.value)}
                              placeholder="English, Telugu, Hindi"
                            />
                            <datalist id="language-options">
                              <option value="English" />
                              <option value="Hindi" />
                              <option value="Telugu" />
                              <option value="Tamil" />
                              <option value="Kannada" />
                              <option value="Malayalam" />
                              <option value="Spanish" />
                              <option value="French" />
                            </datalist>
                          </div>

                          <div className="provider-field provider-field--full">
                            <label htmlFor="session-duration">Session duration</label>
                            <div className="provider-inline-field-group">
                              <select
                                id="session-duration"
                                value={
                                  draft.session_duration === 'custom'
                                    ? 'custom'
                                    : ['30 minutes', '45 minutes', '60 minutes'].includes(draft.session_duration)
                                      ? draft.session_duration
                                      : ''
                                }
                                onChange={(event) => {
                                  const nextValue = event.target.value
                                  if (nextValue === 'custom') {
                                    setDraft((previous) => ({ ...previous, session_duration: 'custom' }))
                                    return
                                  }
                                  handleFieldChange('session_duration', nextValue)
                                }}
                              >
                                <option value="">Select</option>
                                <option value="30 minutes">30 minutes</option>
                                <option value="45 minutes">45 minutes</option>
                                <option value="60 minutes">60 minutes</option>
                                <option value="custom">Custom</option>
                              </select>

                              {(draft.session_duration === 'custom' || (!['30 minutes', '45 minutes', '60 minutes'].includes(draft.session_duration) && draft.session_duration !== '')) && (
                                <input
                                  type="text"
                                  value={draft.session_duration === 'custom' ? '' : draft.session_duration}
                                  onChange={(event) => handleFieldChange('session_duration', event.target.value)}
                                  placeholder="90 minutes"
                                />
                              )}
                            </div>
                          </div>

                          <div className="provider-field provider-field--full">
                            <label>Teaching experience</label>
                            <div className="provider-readout-card">
                              {draft.experience_level ? (
                                <span>{draft.experience_level}</span>
                              ) : (
                                <span className="provider-subtle-copy">This reuses the experience level you selected in Your Skill.</span>
                              )}
                            </div>
                          </div>

                          <div className="provider-field provider-field--full">
                            <label htmlFor="teaching-description">What can learners expect from your sessions?</label>
                            <textarea
                              id="teaching-description"
                              value={draft.teaching_description}
                              onChange={(event) => handleFieldChange('teaching_description', event.target.value)}
                              placeholder="Describe your teaching style, what learners will practice, and what a typical session feels like."
                              rows={5}
                            />
                          </div>
                        </div>
                      )}

                      {section.id === 'agreement' && (
                        <div className="provider-form-grid provider-form-grid--stacked">
                          <div className="provider-field provider-field--full">
                            <p className="provider-body-title">You&apos;re almost ready.</p>
                            <p className="provider-body-copy">
                              Please review the agreement before submitting your Skill Provider application.
                            </p>
                          </div>

                          <div className="provider-legal-links">
                            <a href="/terms" target="_blank" rel="noreferrer">Teacher / Skill Provider Agreement</a>
                            <a href="/privacy" target="_blank" rel="noreferrer">Privacy Policy</a>
                            <span className="provider-legal-link provider-legal-link--muted">Refund &amp; Cancellation Policy</span>
                          </div>

                          <label className="provider-checkbox-row">
                            <input
                              type="checkbox"
                              checked={Boolean(draft.agreement_accepted)}
                              disabled={applicationStatus === 'under_review'}
                              onChange={(event) => handleFieldChange('agreement_accepted', event.target.checked)}
                            />
                            <span>I have read and agree to the Skill Provider Agreement and Privacy Policy.</span>
                          </label>

                          {agreementError && <p className="provider-upload-error">{agreementError}</p>}

                          {applicationStatus !== 'under_review' && (
                            <button type="button" className="primary-button provider-action-button" onClick={handleSubmitApplication} disabled={isSaving}>
                              {isSaving ? 'Submitting...' : 'Submit for Verification'}
                            </button>
                          )}

                          {applicationStatus === 'changes_requested' && canResubmitChanges && (
                            <button type="button" className="primary-button provider-action-button" onClick={handleSubmitApplication} disabled={isSaving}>
                              {isSaving ? 'Resubmitting...' : 'Resubmit for Verification'}
                            </button>
                          )}

                          {applicationStatus === 'under_review' && (
                            <div className="provider-success-state">
                              <p className="provider-status-tag provider-status-tag--muted">Verification Under Review</p>
                              <p className="provider-body-copy">Your Skill Provider application has been submitted and is currently being reviewed.</p>
                            </div>
                          )}
                        </div>
                      )}

                      {section.id !== 'profile' && section.id !== 'about' && section.id !== 'skill' && section.id !== 'demo' && section.id !== 'certificates' && section.id !== 'teaching' && section.id !== 'agreement' && (
                        <>
                          <p className="provider-body-title">Fields coming soon</p>
                          <p className="provider-body-copy">
                            This section will eventually hold the agreement and submission requirements.
                          </p>
                        </>
                      )}

                      <div className="provider-section__footer">
                        <div className="provider-form-actions">
                          {saveMessage && <span className="provider-save-message">{saveMessage}</span>}
                          {saveError && <span className="provider-save-error">{saveError}</span>}
                          {['draft', 'changes_requested'].includes(applicationStatus) && (
                            <button type="button" className="secondary-button" onClick={handleSaveDraft} disabled={isSaving}>
                              {isSaving ? 'Saving...' : 'Save Draft'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
