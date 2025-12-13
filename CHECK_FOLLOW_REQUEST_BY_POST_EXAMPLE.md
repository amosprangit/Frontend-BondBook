# Check Follow Request By Post API - Usage Guide

## Overview
Yeh naya API endpoint check karta hai ki current user ne post owner ko follow request bheji hai ya nahi, sirf `postId` use karke.

## Backend Endpoint

### Route
```
GET /api/users/follow-request-by-post/:postId
```

### Authentication
Required: JWT token in Authorization header

### Response Format

#### Case 1: User's Own Post
```json
{
  "success": true,
  "isOwnPost": true,
  "isFollowing": false,
  "hasPendingRequest": false,
  "status": "own_post"
}
```

#### Case 2: Already Following
```json
{
  "success": true,
  "isOwnPost": false,
  "postOwnerId": "507f1f77bcf86cd799439011",
  "isFollowing": true,
  "hasPendingRequest": false,
  "requestId": null,
  "status": "following"
}
```

#### Case 3: Pending Request
```json
{
  "success": true,
  "isOwnPost": false,
  "postOwnerId": "507f1f77bcf86cd799439011",
  "isFollowing": false,
  "hasPendingRequest": true,
  "requestId": "507f1f77bcf86cd799439012",
  "status": "pending"
}
```

#### Case 4: No Connection
```json
{
  "success": true,
  "isOwnPost": false,
  "postOwnerId": "507f1f77bcf86cd799439011",
  "isFollowing": false,
  "hasPendingRequest": false,
  "requestId": null,
  "status": "none"
}
```

---

## Frontend Usage

### Import the Hook
```typescript
import { useCheckFollowRequestByPostQuery } from '../store/api/authApi';
```

### Example 1: Check Single Post Status
```typescript
function PostCard({ postId }) {
  const { data, isLoading, error } = useCheckFollowRequestByPostQuery(postId);

  if (isLoading) {
    return <ActivityIndicator />;
  }

  if (error) {
    return <Text>Error loading status</Text>;
  }

  return (
    <View>
      {data?.isOwnPost ? (
        <Text>Your Post</Text>
      ) : data?.hasPendingRequest ? (
        <Button title="Request Pending" disabled />
      ) : data?.isFollowing ? (
        <Button title="Following" onPress={handleUnfollow} />
      ) : (
        <Button title="Follow" onPress={handleFollow} />
      )}
    </View>
  );
}
```

### Example 2: Conditional Rendering in Home Screen
```typescript
// In your home.tsx file
import { useCheckFollowRequestByPostQuery } from '../store/api/authApi';

function HomeScreen() {
  const posts = useGetPostsQuery();

  return (
    <ScrollView>
      {posts.data?.map((post) => (
        <PostItem key={post._id} post={post} />
      ))}
    </ScrollView>
  );
}

function PostItem({ post }) {
  // Check follow status for this specific post
  const { data: followStatus } = useCheckFollowRequestByPostQuery(post._id, {
    skip: !post._id, // Skip if no postId
  });

  const renderFollowButton = () => {
    if (!followStatus || followStatus.isOwnPost) {
      return null; // Don't show button for own posts
    }

    if (followStatus.hasPendingRequest) {
      return (
        <View style={styles.pendingRequestButton}>
          <Text style={styles.pendingRequestText}>Request Pending</Text>
        </View>
      );
    }

    if (followStatus.isFollowing) {
      return (
        <TouchableOpacity 
          style={styles.followingButton}
          onPress={() => handleUnfollow(followStatus.postOwnerId)}
        >
          <Text>Following</Text>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity 
        style={styles.followButton}
        onPress={() => handleFollow(followStatus.postOwnerId)}
      >
        <Text>Follow</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.postCard}>
      <View style={styles.postHeader}>
        <Image source={{ uri: post.user?.profilePicture }} />
        <Text>{post.user?.username}</Text>
        {renderFollowButton()}
      </View>
      <Image source={{ uri: post.image }} />
      <Text>{post.caption}</Text>
    </View>
  );
}
```

### Example 3: With Skip Option
```typescript
// Only fetch when needed
function PostDetailScreen({ route }) {
  const { postId } = route.params;
  const [shouldCheckStatus, setShouldCheckStatus] = useState(false);
  
  const { data: followStatus } = useCheckFollowRequestByPostQuery(postId, {
    skip: !shouldCheckStatus, // Only fetch when flag is true
  });

  useEffect(() => {
    // Check status when screen is focused
    setShouldCheckStatus(true);
  }, []);

  return (
    <View>
      {/* Your post detail UI */}
    </View>
  );
}
```

### Example 4: Refetch on Focus
```typescript
import { useFocusEffect } from '@react-navigation/native';

function PostScreen({ postId }) {
  const { data, refetch } = useCheckFollowRequestByPostQuery(postId);

  useFocusEffect(
    useCallback(() => {
      refetch(); // Refresh status when screen comes into focus
    }, [refetch])
  );

  return (
    <View>
      {/* Your UI */}
    </View>
  );
}
```

---

## Key Benefits

1. **Single API Call**: Sirf postId chahiye, userIds dhundne ki zaroorat nahi
2. **Complete Info**: Following, pending, or no connection - sab kuch ek call mein
3. **Own Post Detection**: Automatically detect karta hai ki post current user ki hai
4. **Type Safe**: Full TypeScript support with proper types
5. **Cached**: RTK Query automatically cache karta hai responses

---

## Status Values Explained

| Status | Meaning |
|--------|---------|
| `own_post` | Current user ki apni post hai |
| `following` | Current user already follow kar raha hai post owner ko |
| `pending` | Follow request sent hai but abhi accept nahi hui |
| `none` | No connection hai, follow button dikha sakte ho |

---

## Important Notes

⚠️ **Post ID Required**: Hamesha valid postId pass karo
⚠️ **Authentication Required**: User logged in hona chahiye
⚠️ **Error Handling**: Always handle error states
⚠️ **Skip Option**: Use `skip` option to avoid unnecessary API calls

---

## Testing

### Manual Testing Steps

1. Login karo
2. Home screen par jao
3. Kisi post par follow button click karo
4. API response check karo console mein
5. Verify karo ki correct status show ho raha hai

### Expected Behavior

- ✅ Own posts par follow button nahi dikhna chahiye
- ✅ Pending requests par "Request Pending" button dikhna chahiye
- ✅ Following users par "Following" button dikhna chahiye
- ✅ New users par "Follow" button dikhna chahiye

---

## Error Scenarios

### 1. Invalid Post ID
```json
{
  "success": false,
  "message": "Post not found"
}
```

### 2. Missing Post ID
```json
{
  "success": false,
  "message": "Post ID is required"
}
```

### 3. Unauthorized
```json
{
  "success": false,
  "message": "Authentication required"
}
```

---

## Integration with Existing Code

Aapke current `home.tsx` mein already `handleFollowUser` function hai. Aap is naye API ko use kar sakte ho:

```typescript
// Replace or supplement existing logic
const { data: followStatus } = useCheckFollowRequestByPostQuery(post._id);

// Use in your existing handleFollowUser
const handleFollowUser = async (userId: string, isFollowing: boolean, hasPendingRequest: boolean) => {
  // Use followStatus.hasPendingRequest instead of prop
  if (followStatus?.hasPendingRequest) {
    return;
  }
  // ... rest of your code
};
```

