import React, { useState, useMemo, useEffect } from 'react';
import { View, StyleSheet, Alert, TouchableOpacity, Text, ActivityIndicator, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Canvas, Path, Skia, SkPath, useImage, Image, Fit } from '@shopify/react-native-skia';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

import { getStrokesForNote, saveStrokesForNote, getPageImageUrls } from '../utils/api';

import 'react-native-gesture-handler';

interface Stroke {
    path: SkPath;
    color: string;
    width: number;
}

export default function PdfEditor() {
    const router = useRouter();
    const { name, noteId } = useLocalSearchParams<{ name?: string, noteId?: string }>();
    const decodedName = useMemo(() => (name ? decodeURIComponent(name) : '제목 없음'), [name]);

    const { width: windowWidth, height: windowHeight } = useWindowDimensions();

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [strokes, setStrokes] = useState<Stroke[]>([]);
    const [currentPath, setCurrentPath] = useState<SkPath | null>(null);
    const [pageImageUrls, setPageImageUrls] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(0);

    // Skia의 useImage 훅으로 현재 페이지 이미지를 비동기적으로 로드합니다.
    const image = useImage(pageImageUrls[currentPage]);

    // 노트 데이터(필기, 페이지 URL)를 불러옵니다.
    useEffect(() => {
        if (noteId) {
            const loadNoteData = async () => {
                setIsLoading(true);
                try {
                    const [savedStrokesData, savedPageUrls] = await Promise.all([
                        getStrokesForNote(noteId),
                        getPageImageUrls(noteId)
                    ]);

                    const strokesForCanvas = savedStrokesData.map(item => {
                        if (typeof item.pathString === 'string' && item.pathString) {
                            return {
                                color: item.color || 'black',
                                width: item.width || 4,
                                path: Skia.Path.MakeFromSVGString(item.pathString)!,
                            };
                        }
                        return null;
                    }).filter((item): item is Stroke => item !== null);

                    setStrokes(strokesForCanvas);
                    setPageImageUrls(savedPageUrls);
                } catch (error) {
                    Alert.alert("오류", `노트 데이터를 불러오는 데 실패했습니다.\n\n${error.message}`);
                } finally {
                    setIsLoading(false);
                }
            };
            loadNoteData();
        } else {
            setIsLoading(false);
        }
    }, [noteId]);

    // 필기 저장 핸들러
    const handleSave = async () => {
        if (!noteId || isSaving) return;
        setIsSaving(true);
        try {
            const strokesToSave = strokes.map(stroke => ({
                pathString: stroke.path.toSVGString(),
                color: stroke.color,
                width: stroke.width,
            }));
            await saveStrokesForNote(noteId, strokesToSave);
            Alert.alert("성공", "필기가 저장되었습니다.");
        } catch (error) {
            Alert.alert("오류", `필기를 저장하는 데 실패했습니다.\n\n${error.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    // 제스처 종료 핸들러
    const handleGestureEnd = () => {
        if (currentPath) {
            setStrokes(prevStrokes =>
                [...(Array.isArray(prevStrokes) ? prevStrokes : []), { path: currentPath, color: 'black', width: 4 }]
            );
            setCurrentPath(null);
        }
    };

    // 제스처 정의
    const pan = Gesture.Pan()
        .onStart((g) => {
            const newPath = Skia.Path.Make();
            newPath.moveTo(g.x, g.y);
            runOnJS(setCurrentPath)(newPath);
        })
        .onUpdate((g) => {
            if (currentPath) {
                currentPath.lineTo(g.x, g.y);
            }
        })
        .onEnd(() => {
            runOnJS(handleGestureEnd)();
        })
        .minDistance(1);

    // 화면에 표시할 필기 목록
    const displayStrokes = useMemo(() => {
        if (!Array.isArray(strokes)) return [];
        const allStrokes = [...strokes];
        if (currentPath) {
            allStrokes.push({ path: currentPath, color: 'black', width: 4 });
        }
        return allStrokes;
    }, [strokes, currentPath]);

    if (isLoading) {
        return ( <SafeAreaView style={styles.container}><ActivityIndicator size="large" color="#fff" /></SafeAreaView> );
    }

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
                <View style={styles.toolbar}>
                    <TouchableOpacity onPress={() => router.back()}><Text style={styles.toolText}>Back</Text></TouchableOpacity>
                    <Text style={styles.titleText} numberOfLines={1}>{decodedName}</Text>
                    <TouchableOpacity onPress={handleSave} disabled={isSaving}>
                        <Text style={styles.toolText}>{isSaving ? '저장 중...' : '저장'}</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.editorContainer}>
                    <GestureDetector gesture={pan}>
                        <Canvas style={styles.canvas}>
                            {/* 1. 배경으로 PDF 페이지 이미지를 그립니다. */}
                            {image && (
                                <Image
                                    image={image}
                                    fit="contain"
                                    x={0}
                                    y={0}
                                    width={windowWidth}
                                    height={windowHeight - 140} // 툴바, 페이지 컨트롤 영역 고려
                                />
                            )}

                            {/* 2. 그 위에 필기(strokes)를 그립니다. */}
                            {displayStrokes.map((stroke, index) => (
                                <Path
                                    key={index}
                                    path={stroke.path}
                                    color={stroke.color}
                                    strokeWidth={stroke.width}
                                    style="stroke"
                                    strokeCap="round"
                                    strokeJoin="round"
                                />
                            ))}
                        </Canvas>
                    </GestureDetector>
                </View>

                <View style={styles.pageControls}>
                    <TouchableOpacity
                        onPress={() => setCurrentPage(p => Math.max(0, p - 1))}
                        disabled={currentPage === 0}
                    >
                        <Text style={[styles.toolText, { opacity: currentPage === 0 ? 0.5 : 1 }]}>이전</Text>
                    </TouchableOpacity>
                    <Text style={styles.toolText}>{pageImageUrls.length > 0 ? `${currentPage + 1} / ${pageImageUrls.length}` : '0 / 0'}</Text>
                    <TouchableOpacity
                        onPress={() => setCurrentPage(p => Math.min(pageImageUrls.length - 1, p + 1))}
                        disabled={currentPage >= pageImageUrls.length - 1}
                    >
                        <Text style={[styles.toolText, { opacity: currentPage >= pageImageUrls.length - 1 ? 0.5 : 1 }]}>다음</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#333', justifyContent: 'center', alignItems: 'center' },
    toolbar: {
        height: 50,
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#222',
        paddingHorizontal: 15,
        zIndex: 10,
    },
    editorContainer: {
        flex: 1,
        width: '100%',
    },
    canvas: {
        flex: 1,
    },
    pageControls: {
        height: 50,
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        backgroundColor: '#222',
    },
    toolText: {
        color: 'white',
        fontSize: 16,
        width: 50,
        textAlign: 'center',
    },
    titleText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
        flex: 1,
        textAlign: 'center',
        marginHorizontal: 10,
    },
});