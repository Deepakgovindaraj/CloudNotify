import { simulateDelay } from './api'
import { mockUser } from '@/constants/mockData'

let currentUser = { ...mockUser }

export const authService = {
  async login({ email, password }) {
    await simulateDelay(800)
  
    if (!email || !password) {
      throw new Error('Email and password are required')
    }
  
    if (password.length < 6) {
      throw new Error('Invalid credentials')
    }
  
    currentUser = {
      ...currentUser,
      email,
      name: email.split('@')[0],
    }
  
    return {
      user: currentUser,
      token: 'mock_jwt_token_' + Date.now(),
    }
  },

  async register({ name, email, password }) {
    await simulateDelay(900)

    if (!name || !email || !password) {
      throw new Error('All fields are required')
    }

    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters')
    }

    currentUser = {
      ...currentUser,
      name,
      email,
    }

    return {
      user: currentUser,
      token: 'mock_jwt_token_' + Date.now(),
    }
  },

  async getProfile() {
    await simulateDelay(400)
  
    const savedEmail =
      localStorage.getItem('userEmail')
  
    if (savedEmail) {
      currentUser = {
        ...currentUser,
        email: savedEmail,
        name: savedEmail.split('@')[0],
      }
    }
  
    return { ...currentUser }
  },

  async forgotPassword(email) {
    await simulateDelay(700)

    if (!email) {
      throw new Error('Email is required')
    }

    return {
      message: 'Reset link sent to your email',
    }
  },

  async changePassword({ currentPassword, newPassword }) {
    await simulateDelay(600)

    if (!currentPassword || !newPassword) {
      throw new Error('Both passwords are required')
    }

    if (newPassword.length < 8) {
      throw new Error('New password must be at least 8 characters')
    }

    return {
      success: true,
    }
  },
}