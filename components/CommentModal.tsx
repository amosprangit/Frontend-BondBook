import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Image,
    TextInput,
    FlatList,
    ActivityIndicator,
    SafeAreaView,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

interface CommentsModalProps {
    visible: boolean;
    onClose: () => void;
    selectedPost: any;
    user: any;
    newComment: string;
    setNewComment: (text: string) => void;
    handleSubmitComment: () => void;
    isCommenting: boolean;
}

export default function CommentsModal({
    visible,
    onClose,
    selectedPost,
    user,
    newComment,
    setNewComment,
    handleSubmitComment,
    isCommenting,
}: CommentsModalProps) {
    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <SafeAreaView style={styles.commentsModal}>
                <View style={styles.commentsHeader}>
                    <TouchableOpacity onPress={onClose} style={styles.commentsBackButton}>
                        <Ionicons name="arrow-back" size={24} color="#000" />
                    </TouchableOpacity>
                    <Text style={styles.commentsTitle}>Comments</Text>
                    <View style={{ width: 40 }} />
                </View>

                <FlatList
                    data={selectedPost?.comments || []}
                    keyExtractor={(item) => item._id}
                    renderItem={({ item }) => (
                        <View style={styles.commentItem}>
                            <Image
                                source={{
                                    uri: item.profilePictureUrl
                                        ? API_URL + "/" + item.profilePictureUrl
                                        : `https://ui-avatars.com/api/?name=${item.username}&background=8B5CF6&color=fff`
                                }}
                                style={styles.commentAvatar}
                            />
                            <View style={styles.commentContent}>
                                <View style={styles.commentHeader}>
                                    <Text style={styles.commentUsername}>{item.username}</Text>
                                    <Text style={styles.commentTime}>
                                        {new Date(item.createdAt).toLocaleDateString()}
                                    </Text>
                                </View>
                                <Text style={styles.commentText}>{item.comment}</Text>
                            </View>
                        </View>
                    )}
                    ListEmptyComponent={
                        <View style={styles.emptyComments}>
                            <Ionicons name="chatbubble-outline" size={60} color="#D1D5DB" />
                            <Text style={styles.emptyCommentsTitle}>No comments yet</Text>
                            <Text style={styles.emptyCommentsText}>Be the first to comment</Text>
                        </View>
                    }
                    contentContainerStyle={styles.commentsList}
                />

                <View style={styles.addCommentWrapper}>
                    <Image
                        source={{
                            uri: user?.profilePicture
                                ? API_URL + "/" + user.profilePicture
                                : `https://ui-avatars.com/api/?name=${user?.username || 'You'}&background=8B5CF6&color=fff`
                        }}
                        style={styles.commentInputAvatar}
                    />
                    <View style={styles.commentInputContainer}>
                        <TextInput
                            style={styles.commentInput}
                            placeholder="Add a comment..."
                            placeholderTextColor="#8E8E93"
                            value={newComment}
                            onChangeText={setNewComment}
                            multiline
                            maxLength={500}
                        />
                        {newComment.trim().length > 0 && (
                            <TouchableOpacity
                                onPress={handleSubmitComment}
                                disabled={isCommenting}
                                style={styles.postCommentButton}
                            >
                                {isCommenting ? (
                                    <ActivityIndicator size="small" color="#8B5CF6" />
                                ) : (
                                    <Text style={styles.postCommentText}>Post</Text>
                                )}
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    commentsModal: {
        flex: 1,
        backgroundColor: '#fff',
    },
    commentsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    commentsBackButton: {
        padding: 4,
    },
    commentsTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
    },
    commentsList: {
        padding: 16,
        flexGrow: 1,
    },
    commentItem: {
        flexDirection: 'row',
        marginBottom: 16,
        gap: 12,
    },
    commentAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
    },
    commentContent: {
        flex: 1,
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
        color: '#000',
    },
    commentTime: {
        fontSize: 12,
        color: '#8E8E93',
    },
    commentText: {
        fontSize: 14,
        color: '#000',
        lineHeight: 20,
    },
    emptyComments: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyCommentsTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#000',
        marginTop: 16,
    },
    emptyCommentsText: {
        fontSize: 14,
        color: '#8E8E93',
        marginTop: 4,
    },
    addCommentWrapper: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        backgroundColor: '#fff',
    },
    commentInputAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        marginRight: 12,
    },
    commentInputContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'flex-end',
        backgroundColor: '#f5f5f5',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    commentInput: {
        flex: 1,
        fontSize: 15,
        color: '#000',
        maxHeight: 100,
        padding: 0,
        marginRight: 8,
    },
    postCommentButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    postCommentText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#8B5CF6',
    },
});