/**
 * Development Agents API Routes
 * Handles Developer Agent, Peer Review Agent, and collaborative development workflows
 */

import { Router } from 'express';
import { DeveloperAgent } from '../services/developer-agent';
import { PeerReviewAgent } from '../services/peer-review-agent';
import { DevelopmentCollaborationService } from '../services/development-collaboration-service';

const router = Router();

// Initialize agents and collaboration service
const developerAgent = new DeveloperAgent();
const peerReviewAgent = new PeerReviewAgent();
const collaborationService = new DevelopmentCollaborationService();

/**
 * Start collaborative development session from Designer Agent analysis
 */
router.post('/start-development', async (req, res) => {
  try {
    const { designerAnalysis } = req.body;

    if (!designerAnalysis) {
      return res.status(400).json({
        success: false,
        error: 'Designer analysis is required'
      });
    }

    const session = await collaborationService.startDevelopmentSession(designerAnalysis);

    res.json({
      success: true,
      sessionId: session.sessionId,
      developmentPlan: session.developmentPlan,
      tasksCount: session.tasks.length,
      currentPhase: session.currentPhase
    });

  } catch (error) {
    console.error('Error starting development session:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Execute collaborative development for a specific task
 */
router.post('/develop-task', async (req, res) => {
  try {
    const { sessionId, taskId } = req.body;

    if (!sessionId || !taskId) {
      return res.status(400).json({
        success: false,
        error: 'Session ID and Task ID are required'
      });
    }

    const result = await collaborationService.collaborativelyDevelopTask(sessionId, taskId);

    res.json({
      success: result.success,
      review: result.review,
      improvements: result.improvements,
      status: result.success ? 'approved' : 'needs_improvement'
    });

  } catch (error) {
    console.error('Error in collaborative development:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get session status and progress
 */
router.get('/session/:sessionId/status', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const status = collaborationService.getSessionStatus(sessionId);

    if (!status) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    res.json({
      success: true,
      ...status
    });

  } catch (error) {
    console.error('Error getting session status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get detailed session information
 */
router.get('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = collaborationService.getSessionDetails(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    res.json({
      success: true,
      session
    });

  } catch (error) {
    console.error('Error getting session details:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Implement approved tasks (with dry run option)
 */
router.post('/implement-tasks', async (req, res) => {
  try {
    const { sessionId, dryRun = true } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Session ID is required'
      });
    }

    const result = await collaborationService.implementApprovedTasks(sessionId, dryRun);

    res.json({
      success: true,
      implementedTasks: result.implementedTasks,
      failedTasks: result.failedTasks,
      mode: dryRun ? 'simulation' : 'implementation'
    });

  } catch (error) {
    console.error('Error implementing tasks:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get all active development sessions
 */
router.get('/sessions', async (req, res) => {
  try {
    const activeSessions = collaborationService.getActiveSessions();

    const sessionsWithStatus = activeSessions.map(sessionId => {
      const status = collaborationService.getSessionStatus(sessionId);
      return {
        sessionId,
        ...status
      };
    });

    res.json({
      success: true,
      activeSessions: sessionsWithStatus,
      count: activeSessions.length
    });

  } catch (error) {
    console.error('Error getting active sessions:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Developer Agent: Create development plan
 */
router.post('/developer/create-plan', async (req, res) => {
  try {
    const { designerAnalysis } = req.body;

    if (!designerAnalysis) {
      return res.status(400).json({
        success: false,
        error: 'Designer analysis is required'
      });
    }

    const plan = await developerAgent.createDevelopmentPlan(designerAnalysis);

    res.json({
      success: true,
      developmentPlan: plan
    });

  } catch (error) {
    console.error('Error creating development plan:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Developer Agent: Generate code for specific task
 */
router.post('/developer/generate-code', async (req, res) => {
  try {
    const { task, existingCode } = req.body;

    if (!task) {
      return res.status(400).json({
        success: false,
        error: 'Task is required'
      });
    }

    const generatedTask = await developerAgent.generateCode(task, existingCode);

    res.json({
      success: true,
      generatedTask
    });

  } catch (error) {
    console.error('Error generating code:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Peer Review Agent: Review code
 */
router.post('/peer-review/review', async (req, res) => {
  try {
    const { taskId, generatedFiles, taskDescription } = req.body;

    if (!taskId || !generatedFiles || !taskDescription) {
      return res.status(400).json({
        success: false,
        error: 'Task ID, generated files, and task description are required'
      });
    }

    const review = await peerReviewAgent.reviewCode(taskId, generatedFiles, taskDescription);

    res.json({
      success: true,
      review
    });

  } catch (error) {
    console.error('Error in peer review:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Peer Review Agent: Get review history
 */
router.get('/peer-review/history', async (req, res) => {
  try {
    const history = peerReviewAgent.getReviewHistory();

    res.json({
      success: true,
      reviews: history,
      count: history.length
    });

  } catch (error) {
    console.error('Error getting review history:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Peer Review Agent: Get specific review
 */
router.get('/peer-review/:reviewId', async (req, res) => {
  try {
    const { reviewId } = req.params;
    const review = peerReviewAgent.getReview(reviewId);

    if (!review) {
      return res.status(404).json({
        success: false,
        error: 'Review not found'
      });
    }

    res.json({
      success: true,
      review
    });

  } catch (error) {
    console.error('Error getting review:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Health check for development agents
 */
router.get('/health', async (req, res) => {
  try {
    const activeSessions = collaborationService.getActiveSessions();
    const reviewHistory = peerReviewAgent.getReviewHistory();

    res.json({
      success: true,
      status: 'operational',
      agents: {
        developerAgent: 'ready',
        peerReviewAgent: 'ready',
        collaborationService: 'ready'
      },
      statistics: {
        activeSessions: activeSessions.length,
        totalReviews: reviewHistory.length,
        averageReviewScore: reviewHistory.length > 0 
          ? Math.round(reviewHistory.reduce((sum, r) => sum + r.overallScore, 0) / reviewHistory.length)
          : 0
      }
    });

  } catch (error) {
    console.error('Error in health check:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;