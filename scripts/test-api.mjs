import { spawn } from 'child_process';

const TEST_PORT = 3456;
const BASE_URL = `http://localhost:${TEST_PORT}`;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let passedTests = 0;
let failedTests = 0;

function assert(condition, testName, errorDetails = '') {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${testName} ${errorDetails}`);
    failedTests++;
  }
}

async function runTests() {
  console.log('\n==========================================');
  console.log('🚀 Starting SyncRoom Server for Automated Testing');
  console.log(`Target: ${BASE_URL}`);
  console.log('==========================================\n');

  const env = { ...process.env, PORT: String(TEST_PORT), NODE_ENV: 'production' };
  
  const serverProcess = spawn('npx', ['tsx', 'server.ts'], {
    env,
    shell: true,
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  serverProcess.stderr.on('data', (data) => {
    const msg = data.toString();
    if (!msg.includes('ExperimentalWarning') && !msg.includes('VITE_CONFIG_NATIVE_IGNORE_WARNING')) {
      console.error('[Server Stderr]', msg.trim());
    }
  });

  let serverStarted = false;

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Server start timed out after 15s'));
    }, 15000);

    serverProcess.stdout.on('data', (data) => {
      const msg = data.toString();
      // console.log('[Server Output]:', msg.trim());
      if (msg.includes('SyncRoom Server running on port')) {
        serverStarted = true;
        clearTimeout(timeout);
        resolve();
      }
    });

    serverProcess.on('exit', (code) => {
      if (!serverStarted) {
        clearTimeout(timeout);
        reject(new Error(`Server exited prematurely with code ${code}`));
      }
    });
  });

  console.log('✅ Server successfully initialized!\n');

  try {
    // 1. Firebase Config
    console.log('--- 1. Testing Firebase Config Endpoint ---');
    {
      const res = await fetch(`${BASE_URL}/api/firebase-config`);
      assert(res.status === 200, 'GET /api/firebase-config status 200');
      const data = await res.json();
      assert(data.configured === true, 'Firebase is marked as configured');
      assert(Boolean(data.config?.apiKey), 'Firebase config includes apiKey');
    }

    // 2. Room Creation
    console.log('\n--- 2. Testing Room Lifecycle: Create ---');
    const roomId = `room_test_${Date.now()}`;
    const roomCode = 'TST-999';
    {
      const payload = {
        id: roomId,
        code: roomCode,
        adminId: 'admin_123',
        adminName: 'Alice Admin',
        createdAt: Date.now(),
        status: 'active',
        participants: {},
      };

      const res = await fetch(`${BASE_URL}/api/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      assert(res.status === 200, 'POST /api/rooms returns 200');
      const data = await res.json();
      assert(data.success === true, 'Room created successfully');
      assert(data.room?.id === roomId, 'Room ID matches');
    }

    // 3. Room Lookup by ID and Code
    console.log('\n--- 3. Testing Room Lookup ---');
    {
      const resById = await fetch(`${BASE_URL}/api/rooms/${roomId}`);
      assert(resById.status === 200, `GET /api/rooms/${roomId} returns 200`);
      const dataById = await resById.json();
      assert(dataById.room?.id === roomId, 'Fetched room by ID matches');

      const resByCode = await fetch(`${BASE_URL}/api/rooms/${roomCode}`);
      assert(resByCode.status === 200, `GET /api/rooms/${roomCode} returns 200`);
      const dataByCode = await resByCode.json();
      assert(dataByCode.room?.id === roomId, 'Fetched room by Code matches');
    }

    // 4. Joining Room
    console.log('\n--- 4. Testing Room Joining ---');
    {
      // Host joins
      const joinHostRes = await fetch(`${BASE_URL}/api/rooms/${roomId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: { id: 'admin_123', name: 'Alice Admin', role: 'admin' },
        }),
      });
      assert(joinHostRes.status === 200, 'Host joins room successfully');
      const hostData = await joinHostRes.json();
      assert(hostData.participant?.role === 'admin', 'Host participant role is admin');

      // Guest joins
      const joinGuestRes = await fetch(`${BASE_URL}/api/rooms/${roomId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: { id: 'guest_456', name: 'Bob Guest', role: 'guest' },
        }),
      });
      assert(joinGuestRes.status === 200, 'Guest joins room successfully');
      const guestData = await joinGuestRes.json();
      assert(guestData.participant?.role === 'guest', 'Guest participant role is guest');

      // Verify participant count in room
      const roomCheck = await fetch(`${BASE_URL}/api/rooms/${roomId}`);
      const checkData = await roomCheck.json();
      const count = Object.keys(checkData.room?.participants || {}).length;
      assert(count === 2, `Room has 2 active participants (found ${count})`);
    }

    // 5. Participant State Update
    console.log('\n--- 5. Testing Participant State Updates ---');
    {
      const res = await fetch(`${BASE_URL}/api/rooms/${roomId}/participant-state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'guest_456',
          updates: { isMuted: true, isCameraOff: true },
        }),
      });
      assert(res.status === 200, 'Participant state update returns 200');

      const roomRes = await fetch(`${BASE_URL}/api/rooms/${roomId}`);
      const roomData = await roomRes.json();
      const guest = roomData.room?.participants?.['guest_456'];
      assert(guest?.isMuted === true && guest?.isCameraOff === true, 'Guest state reflects mute and camera off');
    }

    // 6. Messages
    console.log('\n--- 6. Testing Chat Messages ---');
    {
      const msg1 = {
        id: 'msg_1',
        senderId: 'admin_123',
        senderName: 'Alice Admin',
        senderRole: 'admin',
        text: 'Welcome to the sync meeting!',
        timestamp: Date.now(),
      };
      const msg2 = {
        id: 'msg_2',
        senderId: 'guest_456',
        senderName: 'Bob Guest',
        senderRole: 'guest',
        text: 'Hello Alice, glad to be here.',
        timestamp: Date.now() + 10,
      };

      const post1 = await fetch(`${BASE_URL}/api/rooms/${roomId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg1 }),
      });
      assert(post1.status === 200, 'Message 1 posted successfully');

      const post2 = await fetch(`${BASE_URL}/api/rooms/${roomId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg2 }),
      });
      assert(post2.status === 200, 'Message 2 posted successfully');

      const getRes = await fetch(`${BASE_URL}/api/rooms/${roomId}/messages`);
      assert(getRes.status === 200, 'GET messages returns 200');
      const getData = await getRes.json();
      assert(getData.messages?.length === 2, `Messages retrieved correctly (count: ${getData.messages?.length})`);
      assert(getData.messages?.[0]?.text === msg1.text, 'First message content matches');
      assert(getData.messages?.[1]?.text === msg2.text, 'Second message content matches');
    }

    // 7. WebRTC Signaling
    console.log('\n--- 7. Testing WebRTC Signaling Relay ---');
    {
      const now = Date.now();
      const signalPayload = {
        fromUserId: 'admin_123',
        targetUserId: 'guest_456',
        signal: { type: 'offer', sdp: 'dummy-sdp-data' },
        timestamp: now,
      };

      const postRes = await fetch(`${BASE_URL}/api/rooms/${roomId}/signals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signalPayload),
      });
      assert(postRes.status === 200, 'POST signal returns 200');

      const getRes = await fetch(`${BASE_URL}/api/rooms/${roomId}/signals?since=${now - 1000}&excludeUserId=someone_else`);
      assert(getRes.status === 200, 'GET signals returns 200');
      const getData = await getRes.json();
      assert(getData.signals?.length >= 1, 'WebRTC signals retrieved');
      assert(getData.signals?.[0]?.signal?.type === 'offer', 'Signal content matches');
    }

    // 8. Reactions
    console.log('\n--- 8. Testing Emoji Reactions ---');
    {
      const now = Date.now();
      const postRes = await fetch(`${BASE_URL}/api/rooms/${roomId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emoji: '🎉',
          senderName: 'Bob Guest',
          timestamp: now,
        }),
      });
      assert(postRes.status === 200, 'POST reaction returns 200');

      const getRes = await fetch(`${BASE_URL}/api/rooms/${roomId}/reactions?since=${now - 1000}`);
      assert(getRes.status === 200, 'GET reactions returns 200');
      const getData = await getRes.json();
      assert(getData.reactions?.length >= 1, 'Reactions retrieved');
      assert(getData.reactions?.[0]?.emoji === '🎉', 'Emoji matches');
    }

    // 9. Gemini AI Assistant Endpoints
    console.log('\n--- 9. Testing Gemini AI Assistant Integration ---');
    {
      // Summarize
      const sumRes = await fetch(`${BASE_URL}/api/ai/meeting-assistant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: 'summarize',
          context: { roomCode, participantCount: 2 },
          messages: [
            { senderName: 'Alice', senderRole: 'admin', text: 'Let us build the chat feature.' },
            { senderName: 'Bob', senderRole: 'guest', text: 'Agreed, I will work on WebRTC.' },
          ],
        }),
      });
      assert(sumRes.status === 200, 'AI summarize endpoint returns 200');
      const sumData = await sumRes.json();
      assert(Boolean(sumData.result), 'AI summary returns valid content');

      // Smart Replies
      const replyRes = await fetch(`${BASE_URL}/api/ai/meeting-assistant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: 'smart-reply',
          context: {
            messages: [
              { senderName: 'Alice', text: 'Are we ready to release?' },
            ],
          },
        }),
      });
      assert(replyRes.status === 200, 'AI smart-reply endpoint returns 200');
      const replyData = await replyRes.json();
      assert(Array.isArray(replyData.replies) && replyData.replies.length > 0, 'Smart replies returns array of strings');

      // Translation
      const transRes = await fetch(`${BASE_URL}/api/ai/meeting-assistant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: 'translate',
          prompt: 'Hello and welcome everyone',
          targetLanguage: 'Spanish',
        }),
      });
      assert(transRes.status === 200, 'AI translation endpoint returns 200');
      const transData = await transRes.json();
      assert(Boolean(transData.result), 'AI translation returns result');

      // AI Co-Host / Ask AI
      const askRes = await fetch(`${BASE_URL}/api/ai/meeting-assistant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: 'ask-ai',
          prompt: 'What did Bob agree to work on?',
          context: {
            messages: [
              { senderName: 'Bob', text: 'I will work on WebRTC.' },
            ],
          },
        }),
      });
      assert(askRes.status === 200, 'AI ask-ai endpoint returns 200');
      const askData = await askRes.json();
      assert(Boolean(askData.result), 'AI question answering returns result');
    }

    // 10. Room Leave & End
    console.log('\n--- 10. Testing Leave and End Room Lifecycle ---');
    {
      // Guest leaves
      const leaveRes = await fetch(`${BASE_URL}/api/rooms/${roomId}/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'guest_456' }),
      });
      assert(leaveRes.status === 200, 'Guest leaves room returns 200');

      const roomAfterLeave = await fetch(`${BASE_URL}/api/rooms/${roomId}`);
      const leaveData = await roomAfterLeave.json();
      assert(!leaveData.room?.participants?.['guest_456'], 'Guest removed from active participants');

      // Admin ends room
      const endRes = await fetch(`${BASE_URL}/api/rooms/${roomId}/end`, {
        method: 'POST',
      });
      assert(endRes.status === 200, 'Admin end room returns 200');

      const endedRoomRes = await fetch(`${BASE_URL}/api/rooms/${roomId}`);
      const endedData = await endedRoomRes.json();
      assert(endedData.room?.status === 'ended', 'Room status updated to ended');

      // Attempting to join ended room should return 410
      const rejoinRes = await fetch(`${BASE_URL}/api/rooms/${roomId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: { id: 'new_user', name: 'New User' } }),
      });
      assert(rejoinRes.status === 410, 'Joining ended room correctly rejected with 410 Gone');
    }

    // 11. Frontend SPA Serving
    console.log('\n--- 11. Testing Frontend Static / SPA Serving ---');
    {
      const rootRes = await fetch(`${BASE_URL}/`);
      assert(rootRes.status === 200, 'GET / returns 200');
      const html = await rootRes.text();
      assert(html.includes('<div id="root">') || html.includes('<!DOCTYPE html>'), 'Root returns index.html');

      // SPA client route fallback
      const spaRes = await fetch(`${BASE_URL}/room/TST-999`);
      assert(spaRes.status === 200, 'GET /room/TST-999 returns 200 (SPA fallback)');
      const spaHtml = await spaRes.text();
      assert(spaHtml.includes('<div id="root">') || spaHtml.includes('<!DOCTYPE html>'), 'SPA route serves index.html');
    }

  } finally {
    console.log('\n🛑 Cleaning up and terminating test server process...');
    serverProcess.kill('SIGTERM');
    // On Windows, kill tree if needed
    try {
      spawn('taskkill', ['/pid', String(serverProcess.pid), '/f', '/t']);
    } catch {}
  }

  console.log('\n==========================================');
  console.log(`Test Results: ${passedTests} passed, ${failedTests} failed`);
  console.log('==========================================\n');

  if (failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});

