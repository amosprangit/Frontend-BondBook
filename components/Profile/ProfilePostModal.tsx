import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Image,
    ScrollView,
    TextInput,
    ActivityIndicator,
    SafeAreaView,
    Platform,
    Dimensions,
    KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

interface PostModalProps {
    visible: boolean;
    onClose: () => void;
    post: any;
    username: string;
    profilePicture: string;
    newComment: string;
    onCommentChange: (text: string) => void;
    onLike: () => void;
    onCommentSubmit: () => void;
    onDelete: () => void;
    onShare: () => void;
    isCommenting: boolean;
}

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function PostModal({
    visible,
    onClose,
    post,
    username,
    profilePicture,
    newComment,
    onCommentChange,
    onLike,
    onCommentSubmit,
    onDelete,
    onShare,
    isCommenting,
}: PostModalProps) {
    if (!post) return null;

    return (
        <Modal
            visible={visible}
            transparent={false}
            animationType="slide"
            onRequestClose={onClose}
            statusBarTranslucent={true}
        >
            <SafeAreaView style={styles.container}>
                <KeyboardAvoidingView
                    style={styles.keyboardView}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={onClose} style={styles.backButton} activeOpacity={0.7}>
                            <Ionicons name="arrow-back" size={24} color="#111827" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Post</Text>
                        <TouchableOpacity onPress={onDelete} style={styles.deleteButton} activeOpacity={0.7}>
                            <Ionicons name="trash-outline" size={24} color="#EF4444" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        style={styles.content}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.contentContainer}
                    >
                        {/* Image */}
                        <View style={styles.imageContainer}>
                            <Image
                                source={{ uri: `${API_URL}/${post.image || post.imageUrl}` }}
                                style={styles.image}
                                resizeMode="cover"
                            />
                            <LinearGradient
                                colors={['transparent', 'rgba(0,0,0,0.3)']}
                                style={styles.imageGradient}
                            />
                        </View>

                        {/* Post Content */}
                        <View style={styles.postContent}>
                            {/* Actions */}
                            <View style={styles.actions}>
                                <TouchableOpacity
                                    style={styles.actionButton}
                                    onPress={onLike}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons
                                        name={post.isLiked ? "heart" : "heart-outline"}
                                        size={26}
                                        color={post.isLiked ? "#EF4444" : "#6B7280"}
                                    />
                                    <Text style={[styles.actionText, post.isLiked && styles.actionTextActive]}>
                                        {post.likeCount || post.likes || 0}
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.actionButton} activeOpacity={0.7}>
                                    <Ionicons name="chatbubble-outline" size={24} color="#6B7280" />
                                    <Text style={styles.actionText}>
                                        {post.comments?.length || 0}
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.actionButton} onPress={onShare} activeOpacity={0.7}>
                                    <Ionicons name="share-outline" size={24} color="#6B7280" />
                                </TouchableOpacity>
                            </View>

                            {/* Caption */}
                            <View style={styles.captionContainer}>
                                <Text style={styles.caption}>
                                    <Text style={styles.captionUsername}>{username}</Text>
                                    {' '}{post.caption || 'No caption'}
                                </Text>
                                <Text style={styles.date}>
                                    {new Date(post.createdAt).toLocaleDateString('en-US', {
                                        month: 'long',
                                        day: 'numeric',
                                        year: 'numeric'
                                    })}
                                </Text>
                            </View>

                            {/* Comments */}
                            {post.comments && post.comments.length > 0 && (
                                <View style={styles.commentsSection}>
                                    <Text style={styles.commentsTitle}>
                                        Comments ({post.comments.length})
                                    </Text>
                                    {post.comments.map((comment: any, index: number) => (
                                        <View
                                            key={comment._id}
                                            style={[
                                                styles.commentItem,
                                                index === post.comments.length - 1 && styles.lastCommentItem
                                            ]}
                                        >
                                            <View style={styles.commentHeader}>
                                                <Text style={styles.commentUsername}>
                                                    {comment.user?.username || comment.username}
                                                </Text>
                                                <Text style={styles.commentTime}>
                                                    {new Date(comment.createdAt).toLocaleDateString()}
                                                </Text>
                                            </View>
                                            <Text style={styles.commentText}>
                                                {comment.text || comment.comment}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </View>
                    </ScrollView>

                    {/* Comment Input */}
                    <View style={styles.addCommentContainer}>
                        <Image
                            source={{ uri: profilePicture }}
                            style={styles.commentAvatar}
                        />
                        <View style={styles.commentInputWrapper}>
                            <TextInput
                                style={styles.commentInput}
                                placeholder="Add a comment..."
                                placeholderTextColor="#9CA3AF"
                                value={newComment}
                                onChangeText={onCommentChange}
                                multiline
                                maxLength={500}
                            />
                        </View>
                        <TouchableOpacity
                            onPress={onCommentSubmit}
                            disabled={!newComment.trim() || isCommenting}
                            style={[
                                styles.postCommentButton,
                                !newComment.trim() && styles.postCommentButtonDisabled
                            ]}
                            activeOpacity={0.7}
                        >
                            {isCommenting ? (
                                <ActivityIndicator size="small" color="#8B5CF6" />
                            ) : (
                                <LinearGradient
                                    colors={!newComment.trim() ? ['#D1D5DB', '#D1D5DB'] : ['#8B5CF6', '#EC4899']}
                                    style={styles.postCommentGradient}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                >
                                    <Text style={styles.postCommentText}>Post</Text>
                                </LinearGradient>
                            )}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    keyboardView: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: Platform.OS === 'ios' ? 12 : 16,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
    },
    deleteButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FEE2E2',
    },
    content: {
        flex: 1,
    },
    contentContainer: {
        paddingBottom: Platform.OS === 'ios' ? 80 : 100,
    },
    imageContainer: {
        width: width,
        height: width * 0.9,
        backgroundColor: '#F3F4F6',
        position: 'relative',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    imageGradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 60,
    },
    postContent: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 20,
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        gap: 20,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    actionText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#6B7280',
    },
    actionTextActive: {
        color: '#EF4444',
    },
    captionContainer: {
        marginTop: 8,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    caption: {
        fontSize: 15,
        color: '#374151',
        lineHeight: 22,
    },
    captionUsername: {
        fontWeight: '700',
        color: '#111827',
    },
    date: {
        fontSize: 12,
        color: '#9CA3AF',
        marginTop: 6,
    },
    commentsSection: {
        marginTop: 16,
    },
    commentsTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 12,
    },
    commentItem: {
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    lastCommentItem: {
        borderBottomWidth: 0,
    },
    commentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    commentUsername: {
        fontSize: 14,
        fontWeight: '600',
        color: '#111827',
    },
    commentTime: {
        fontSize: 11,
        color: '#9CA3AF',
    },
    commentText: {
        fontSize: 14,
        color: '#374151',
        lineHeight: 20,
    },
    addCommentContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: Platform.OS === 'ios' ? 12 : 16,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 4,
    },
    commentAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 2,
        borderColor: '#8B5CF6',
    },
    commentInputWrapper: {
        flex: 1,
        marginLeft: 10,
        marginRight: 10,
        backgroundColor: '#F3F4F6',
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: Platform.OS === 'ios' ? 8 : 4,
        maxHeight: 80,
    },
    commentInput: {
        fontSize: 15,
        color: '#111827',
        padding: 0,
        minHeight: 36,
    },
    postCommentButton: {
        borderRadius: 20,
        overflow: 'hidden',
    },
    postCommentButtonDisabled: {
        opacity: 0.5,
    },
    postCommentGradient: {
        paddingHorizontal: 18,
        paddingVertical: 9,
        alignItems: 'center',
        justifyContent: 'center',
    },
    postCommentText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFFFFF',
    },
});