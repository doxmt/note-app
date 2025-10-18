import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
    View, Text, TouchableOpacity, ActivityIndicator,
    Dimensions, StyleSheet, PanResponder, Animated, Alert
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Canvas, Path, Skia, Image as SkiaImage, useImage } from '@shopify/react-native-skia';
import { useRouter, useLocalSearchParams } from 'expo-router';
import axios from 'axios';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
export const API_BASE = 'http://192.168.36.35:5001';

interface Stroke {
    pathString: string;
    color: string;
    width: number;
}
interface PageData {
    pageIndex: number;
    strokes: Stroke[];
}
type Tool = 'pen' | 'highlighter' | 'eraser';

export default function PdfEditor() {
    const router = useRouter();
    const { noteId } = useLocalSearchParams<{ noteId: string }>();

    const [noteName, setNoteName] = useState('PDF 문서');
    const [pageImageUrls, setPageImageUrls] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(0);
    const [pageStrokes, setPageStrokes] = useState<Record<number, Stroke[]>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [undoStacks, setUndoStacks] = useState<Record<number, Stroke[][]>>({});
    const [redoStacks, setRedoStacks] = useState<Record<number, Stroke[][]>>({});
    const [tool, setTool] = useState<Tool>('pen');
    const [activeTool, setActiveTool] = useState<Tool | null>(null);
    const [strokeColor, setStrokeColor] = useState('#000000');
    const [strokeWidth, setStrokeWidth] = useState(3);
    const [eraserRadius, setEraserRadius] = useState(24);
    const [highlightOpacity, setHighlightOpacity] = useState(0.4);
    const imageSize = useRef({ width: 1, height: 1 });
    const offset = useRef({ x: 0, y: 0 });
    const [scale, setScale] = useState(1);
    const currentPath = useRef(Skia.Path.Make());
    const saveTimer = useRef<NodeJS.Timeout | null>(null);
    const [eraserPos, setEraserPos] = useState<{ x: number; y: number } | null>(null);
    const panelAnim = useRef(new Animated.Value(0)).current;
    const image = useImage(pageImageUrls[currentPage]);

    useEffect(() => {
        const load = async () => {
            try {
                setIsLoading(true);
                const [pages, note, strokes] = await Promise.all([
                    axios.get(`${API_BASE}/api/notes/${noteId}/pages`),
                    axios.get(`${API_BASE}/api/notes/${noteId}`).catch(() => ({ data: { name: 'PDF 문서' } })),
                    axios.get(`${API_BASE}/api/notes/${noteId}/strokes`).catch(() => ({ data: [] })),
                ]);
                setNoteName(note.data.name || 'PDF 문서');
                const urls = pages.data.map((id: string) => `${API_BASE}/api/notes/page/${id}`);
                setPageImageUrls(urls);
                const map: Record<number, Stroke[]> = {};
                (strokes.data as PageData[]).forEach(p => (map[p.pageIndex] = p.strokes ?? []));
                setPageStrokes(map);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, [noteId]);

    useEffect(() => {
        if (!image) return;
        const iw = image.width();
        const ih = image.height();
        const s = Math.min(screenWidth / iw, (screenHeight - 200) / ih) * 1.1;
        imageSize.current = { width: iw, height: ih };
        offset.current = { x: (screenWidth - iw * s) / 2, y: (screenHeight - ih * s - 180) / 2 };
        setScale(s);
    }, [image]);

    const saveStrokes = async () => {
        const payload: PageData[] = Object.keys(pageStrokes).map(k => ({
            pageIndex: Number(k),
            strokes: pageStrokes[Number(k)],
        }));
        try {
            await axios.put(`${API_BASE}/api/notes/${noteId}/strokes`, payload);
        } catch {
            Alert.alert('저장 실패', '서버에 데이터를 저장하지 못했다.');
        }
    };

    // ✅ 선 전체 닿으면 지워지는 로직
    const isNearPath = (svg: string, x: number, y: number) => {
        const r = eraserRadius / scale;
        const points = [...svg.matchAll(/([ML])(\d+(\.\d+)?) (\d+(\.\d+)?)/g)]
            .map(m => ({ x: parseFloat(m[2]), y: parseFloat(m[4]) }));
        return points.some(p => Math.hypot(p.x - x, p.y - y) <= r);
    };

    const panResponder = useMemo(
        () =>
            PanResponder.create({
                onStartShouldSetPanResponder: () => true,
                onPanResponderGrant: e => {
                    const { locationX, locationY } = e.nativeEvent;
                    if (tool === 'eraser') {
                        setEraserPos({ x: locationX, y: locationY });
                        return;
                    }
                    const x = (locationX - offset.current.x) / scale;
                    const y = (locationY - offset.current.y) / scale;
                    currentPath.current = Skia.Path.Make();
                    currentPath.current.moveTo(x, y);
                    const stroke: Stroke = {
                        pathString: currentPath.current.toSVGString(),
                        color: tool === 'highlighter'
                            ? strokeColor.replace('0.4', highlightOpacity.toString())
                            : strokeColor,
                        width: tool === 'highlighter' ? 15 / scale : strokeWidth / scale,
                    };
                    setPageStrokes(prev => ({
                        ...prev,
                        [currentPage]: [...(prev[currentPage] || []), stroke],
                    }));
                },
                onPanResponderMove: e => {
                    const { locationX, locationY } = e.nativeEvent;
                    if (tool === 'eraser') {
                        setEraserPos({ x: locationX, y: locationY });
                        const ex = (locationX - offset.current.x) / scale;
                        const ey = (locationY - offset.current.y) / scale;
                        setPageStrokes(prev => {
                            const updated = { ...prev };
                            updated[currentPage] = (updated[currentPage] || []).filter(s => !isNearPath(s.pathString, ex, ey));
                            return updated;
                        });
                        return;
                    }
                    const x = (locationX - offset.current.x) / scale;
                    const y = (locationY - offset.current.y) / scale;
                    currentPath.current.lineTo(x, y);
                    const stroke: Stroke = {
                        pathString: currentPath.current.toSVGString(),
                        color: tool === 'highlighter'
                            ? strokeColor.replace('0.4', highlightOpacity.toString())
                            : strokeColor,
                        width: tool === 'highlighter' ? 15 / scale : strokeWidth / scale,
                    };
                    setPageStrokes(prev => {
                        const list = prev[currentPage] || [];
                        const replaced = [...list.slice(0, -1), stroke];
                        return { ...prev, [currentPage]: replaced };
                    });
                },
                onPanResponderRelease: () => {
                    setEraserPos(null);
                    if (tool !== 'eraser') {
                        setUndoStacks(prev => ({
                            ...prev,
                            [currentPage]: [...(prev[currentPage] || []), [...(pageStrokes[currentPage] || [])]],
                        }));
                        setRedoStacks(prev => ({ ...prev, [currentPage]: [] }));
                    }
                    if (saveTimer.current) clearTimeout(saveTimer.current);
                    saveTimer.current = setTimeout(saveStrokes, 1000);
                },
            }),
        [tool, strokeColor, strokeWidth, highlightOpacity, eraserRadius, currentPage, scale]
    );

    const handleUndo = () => {
        const stack = undoStacks[currentPage] || [];
        if (stack.length === 0) return;
        const newUndo = [...stack];
        const last = newUndo.pop()!;
        setUndoStacks(prev => ({ ...prev, [currentPage]: newUndo }));
        setRedoStacks(prev => ({
            ...prev,
            [currentPage]: [...(prev[currentPage] || []), pageStrokes[currentPage] || []],
        }));
        setPageStrokes(prev => ({ ...prev, [currentPage]: last }));
    };
    const handleRedo = () => {
        const stack = redoStacks[currentPage] || [];
        if (stack.length === 0) return;
        const newRedo = [...stack];
        const next = newRedo.pop()!;
        setRedoStacks(prev => ({ ...prev, [currentPage]: newRedo }));
        setUndoStacks(prev => ({
            ...prev,
            [currentPage]: [...(prev[currentPage] || []), pageStrokes[currentPage] || []],
        }));
        setPageStrokes(prev => ({ ...prev, [currentPage]: next }));
    };

    const toggleToolPanel = (t: Tool) => {
        if (activeTool === t) {
            Animated.timing(panelAnim, { toValue: 0, duration: 180, useNativeDriver: false }).start(() =>
                setActiveTool(null)
            );
        } else {
            setActiveTool(t);
            Animated.timing(panelAnim, { toValue: 1, duration: 180, useNativeDriver: false }).start();
        }
    };

    const currentStrokes = pageStrokes[currentPage] || [];
    const handlePrev = () => setCurrentPage(p => Math.max(0, p - 1));
    const handleNext = () => setCurrentPage(p => Math.min(pageImageUrls.length - 1, p + 1));

    if (isLoading)
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#0ea5e9" />
                <Text>불러오는 중…</Text>
            </View>
        );

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Feather name="arrow-left" size={22} color="#1e293b" />
                    </TouchableOpacity>
                    <View style={styles.pageNav}>
                        <TouchableOpacity onPress={handlePrev}>
                            <Feather name="chevron-left" size={22} color="#1e293b" />
                        </TouchableOpacity>
                        <Text style={styles.pageNumber}>{currentPage + 1} / {pageImageUrls.length}</Text>
                        <TouchableOpacity onPress={handleNext}>
                            <Feather name="chevron-right" size={22} color="#1e293b" />
                        </TouchableOpacity>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        <TouchableOpacity onPress={handleUndo}>
                            <Feather name="rotate-ccw" size={22} color="#334155" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleRedo}>
                            <Feather name="rotate-cw" size={22} color="#334155" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={saveStrokes}>
                            <Feather name="save" size={22} color="#0ea5e9" />
                        </TouchableOpacity>
                    </View>
                </View>

                <Text style={styles.noteTitle}>{noteName}</Text>

                {/* 툴바 + 옵션 패널 */}
                <View style={styles.toolbar}>
                    <View style={styles.leftTools}>
                        <TouchableOpacity onPress={() => { setTool('pen'); toggleToolPanel('pen'); }}>
                            <Feather name="edit-3" size={22} color={tool === 'pen' ? '#0ea5e9' : '#6b7280'} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => { setTool('highlighter'); toggleToolPanel('highlighter'); }}>
                            <Feather name="pen-tool" size={22} color={tool === 'highlighter' ? '#facc15' : '#6b7280'} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => { setTool('eraser'); toggleToolPanel('eraser'); }}>
                            <MaterialCommunityIcons name="eraser-variant" size={24} color={tool === 'eraser' ? '#ef4444' : '#6b7280'} />
                        </TouchableOpacity>
                    </View>

                    {/* ✅ 옵션 패널 복원 */}
                    <Animated.View
                        style={[
                            styles.optionPanel,
                            {
                                width: panelAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0, screenWidth * 0.55],
                                }),
                                opacity: panelAnim,
                            },
                        ]}
                    >
                        {activeTool === 'pen' ? (
                            <View style={styles.optionRow}>
                                <View style={styles.colorGroup}>
                                    {['#000', '#dc2626', '#2563eb', '#16a34a'].map(c => (
                                        <TouchableOpacity
                                            key={c}
                                            style={[
                                                styles.colorBtn,
                                                { backgroundColor: c, borderColor: strokeColor === c ? '#0ea5e9' : '#cbd5e1' },
                                            ]}
                                            onPress={() => setStrokeColor(c)}
                                        />
                                    ))}
                                </View>
                                <View style={styles.thicknessGroup}>
                                    {[2, 4, 6, 8, 10].map(w => (
                                        <TouchableOpacity
                                            key={w}
                                            style={[
                                                styles.thickBtn,
                                                { borderColor: strokeWidth === w ? '#0ea5e9' : '#e5e7eb' },
                                            ]}
                                            onPress={() => setStrokeWidth(w)}
                                        >
                                            <View style={{ height: w, backgroundColor: '#1e293b', width: 24, borderRadius: 4 }} />
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        ) : activeTool === 'highlighter' ? (
                            <View style={styles.optionRow}>
                                <View style={styles.colorGroup}>
                                    {['rgba(255,255,0,0.4)', 'rgba(135,206,250,0.4)', 'rgba(255,182,193,0.4)', 'rgba(144,238,144,0.4)'].map(c => (
                                        <TouchableOpacity
                                            key={c}
                                            style={[
                                                styles.colorBtn,
                                                { backgroundColor: c.replace('0.4', '1'), borderColor: strokeColor === c ? '#facc15' : '#cbd5e1' },
                                            ]}
                                            onPress={() => setStrokeColor(c)}
                                        />
                                    ))}
                                </View>
                                <View style={styles.thicknessGroup}>
                                    {[8, 12, 16, 20].map(w => (
                                        <TouchableOpacity
                                            key={w}
                                            style={[
                                                styles.thickBtn,
                                                { borderColor: strokeWidth === w ? '#facc15' : '#e5e7eb' },
                                            ]}
                                            onPress={() => setStrokeWidth(w)}
                                        >
                                            <View style={{ height: w, backgroundColor: 'rgba(250,204,21,0.5)', width: 28, borderRadius: 6 }} />
                                        </TouchableOpacity>
                                    ))}
                                </View>
                                <View style={styles.thicknessGroup}>
                                    {[0.2, 0.4, 0.6].map(o => (
                                        <TouchableOpacity
                                            key={o}
                                            style={[
                                                styles.thickBtn,
                                                { borderColor: highlightOpacity === o ? '#facc15' : '#e5e7eb' },
                                            ]}
                                            onPress={() => setHighlightOpacity(o)}
                                        >
                                            <Text style={{ color: '#1e293b', fontWeight: '600' }}>{Math.round(o * 100)}%</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        ) : activeTool === 'eraser' ? (
                            <View style={styles.optionRow}>
                                {[12, 20, 28, 36].map(r => (
                                    <TouchableOpacity
                                        key={r}
                                        style={[styles.thickBtn, { borderColor: eraserRadius === r ? '#ef4444' : '#e5e7eb' }]}
                                        onPress={() => setEraserRadius(r)}
                                    >
                                        <View style={{ height: r, width: r, borderRadius: r / 2, backgroundColor: 'rgba(239,68,68,0.25)' }} />
                                    </TouchableOpacity>
                                ))}
                            </View>
                        ) : null}
                    </Animated.View>
                </View>

                <View style={styles.canvasContainer} {...panResponder.panHandlers}>
                    <Canvas style={styles.canvas}>
                        {image && (
                            <SkiaImage
                                image={image}
                                x={offset.current.x}
                                y={offset.current.y}
                                width={imageSize.current.width * scale}
                                height={imageSize.current.height * scale}
                            />
                        )}
                        {currentStrokes.map((s, i) => (
                            <Path
                                key={i}
                                path={Skia.Path.MakeFromSVGString(s.pathString)!}
                                color={s.color}
                                style="stroke"
                                strokeWidth={s.width * scale}
                                transform={[{ translateX: offset.current.x }, { translateY: offset.current.y }, { scale }]}
                            />
                        ))}
                        {tool === 'eraser' && eraserPos && (
                            <Path
                                path={(() => {
                                    const c = Skia.Path.Make();
                                    c.addCircle(eraserPos.x, eraserPos.y, eraserRadius);
                                    return c;
                                })()}
                                color="rgba(239,68,68,0.3)"
                                style="stroke"
                                strokeWidth={2}
                            />
                        )}
                    </Canvas>
                </View>
            </SafeAreaView>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderColor: '#e2e8f0',
    },
    noteTitle: { textAlign: 'center', fontSize: 14, color: '#475569', backgroundColor: '#f1f5f9', paddingVertical: 6 },
    toolbar: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: '#e2e8f0', paddingHorizontal: 10, height: 48, borderBottomWidth: 1, borderColor: '#cbd5e1',
    },
    leftTools: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    optionPanel: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start',
        overflow: 'hidden', backgroundColor: '#f9fafb', borderRadius: 8, paddingHorizontal: 12, height: 40,
    },
    optionRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    colorGroup: { flexDirection: 'row', gap: 10 },
    colorBtn: { width: 24, height: 24, borderRadius: 12, borderWidth: 2 },
    thicknessGroup: { flexDirection: 'row', gap: 10 },
    thickBtn: { borderWidth: 2, borderRadius: 8, padding: 4, backgroundColor: '#fff' },
    canvasContainer: { flex: 1, backgroundColor: '#fff' },
    canvas: { flex: 1 },
    pageNav: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    pageNumber: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
