import { simulateDelay } from './api'
let currentUser = null

export const authService = {
  async login({ name, email, password }) {
    await simulateDelay(800)
  
    if (!email || !password) {
      throw new Error('Email and password are required')
    }
  
    if (password.length < 6) {
      throw new Error('Invalid credentials')
    }
  
    currentUser = {
      email,
      name: name || email.split('@')[0],
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
  
    const savedUser =
      localStorage.getItem('currentUser')
  
    if (!savedUser) {
      throw new Error('No user found')
    }
  
    currentUser = JSON.parse(savedUser)
  
    return currentUser
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