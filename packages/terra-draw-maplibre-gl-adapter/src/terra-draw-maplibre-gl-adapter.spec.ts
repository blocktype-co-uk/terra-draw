/**
 * @jest-environment jsdom
 */
import { TerraDrawAdapterStyling, TerraDrawExtend } from "terra-draw";

import { TextDecoder, TextEncoder } from "util";
global.TextDecoder = TextDecoder as typeof global.TextDecoder;
global.TextEncoder = TextEncoder as typeof global.TextEncoder;
global.URL.createObjectURL = jest.fn();

import { TerraDrawMapLibreGLAdapter } from "./terra-draw-maplibre-gl-adapter";

import * as maplibregl from "maplibre-gl";

describe("TerraDrawMapLibreGLAdapter", () => {
	const createMapLibreGLMap = () => {
		return {
			project: jest.fn(() => ({ x: 0, y: 0 }) as any),
			unproject: jest.fn(() => ({ lng: 0, lat: 0 }) as any),
			getCanvas: jest.fn(
				() =>
					({
						addEventListener: jest.fn(),
						removeEventListener: jest.fn(),
						style: { removeProperty: jest.fn(), cursor: "initial" },
					}) as any,
			),
			getContainer: jest.fn(
				() =>
					({
						getBoundingClientRect: jest.fn().mockReturnValue({
							left: 0,
							top: 0,
						} as DOMRect),
					}) as unknown as HTMLElement,
			),
			doubleClickZoom: {
				enable: jest.fn(),
				disable: jest.fn(),
				isActive: jest.fn(),
				isEnabled: jest.fn(),
			} as unknown as maplibregl.DoubleClickZoomHandler,
			dragPan: {
				enable: jest.fn(),
				disable: jest.fn(),
				isActive: jest.fn(),
				isEnabled: jest.fn(() => true),
			} as unknown as maplibregl.DragPanHandler,
			dragRotate: {
				enable: jest.fn(),
				disable: jest.fn(),
				isActive: jest.fn(),
				isEnabled: jest.fn(() => true),
			} as unknown as maplibregl.DragRotateHandler,
			addSource: jest.fn(),
			addLayer: jest.fn(),
			moveLayer: jest.fn(),
			removeLayer: jest.fn(),
			removeSource: jest.fn(),
			getSource: jest.fn(() => ({ setData: jest.fn() })) as any,
			on: jest.fn(),
			off: jest.fn(),
		} as Partial<maplibregl.Map>;
	};

	const MockPointerEvent = () =>
		({
			bubbles: true,
			cancelable: true,
			clientX: 0,
			clientY: 0,
			button: 0,
			buttons: 1,
			pointerId: 1,
			pointerType: "mouse",
			isPrimary: true,
		}) as PointerEvent;

	const MockCallbacks = (
		overrides?: Partial<TerraDrawExtend.TerraDrawCallbacks>,
	): TerraDrawExtend.TerraDrawCallbacks => ({
		getState: jest.fn(),
		onKeyUp: jest.fn(),
		onKeyDown: jest.fn(),
		onClick: jest.fn(),
		onMouseMove: jest.fn(),
		onDragStart: jest.fn(),
		onDrag: jest.fn(),
		onDragEnd: jest.fn(),
		onClear: jest.fn(),
		onReady: jest.fn(),
		...overrides,
	});

	beforeEach(() => {
		jest.restoreAllMocks();
	});

	describe("constructor", () => {
		it("instantiates the adapter correctly", () => {
			const adapter = new TerraDrawMapLibreGLAdapter({
				map: createMapLibreGLMap() as maplibregl.Map,
				minPixelDragDistance: 1,
				minPixelDragDistanceSelecting: 8,
				minPixelDragDistanceDrawing: 8,
				coordinatePrecision: 9,
			});

			expect(adapter).toBeDefined();
			expect(adapter.getMapEventElement).toBeDefined();
			expect(adapter.render).toBeDefined();
			expect(adapter.register).toBeDefined();
			expect(adapter.unregister).toBeDefined();
			expect(adapter.project).toBeDefined();
			expect(adapter.unproject).toBeDefined();
			expect(adapter.setCursor).toBeDefined();
		});
	});

	describe("getLngLatFromEvent", () => {
		let adapter: TerraDrawMapLibreGLAdapter<maplibregl.Map>;
		const map = createMapLibreGLMap();
		beforeEach(() => {
			adapter = new TerraDrawMapLibreGLAdapter({
				map,
			});
		});
		it("getLngLatFromEvent returns correct coordinates", () => {
			// Mock the containerPointToLatLng function
			map.unproject = jest.fn(() => ({
				lat: 51.507222,
				lng: -0.1275,
			})) as unknown as (point: maplibregl.PointLike) => maplibregl.LngLat;

			const result = adapter.getLngLatFromEvent(MockPointerEvent());
			expect(result).toEqual({ lat: 51.507222, lng: -0.1275 });
		});
	});

	describe("setDraggability", () => {
		describe("when disabling first", () => {
			it("setDraggability disables and re-enables map dragging", () => {
				// drag pan and rotate are enabled by default
				const map = createMapLibreGLMap();

				const adapter = new TerraDrawMapLibreGLAdapter({
					map: map as maplibregl.Map,
				});

				// Test disabling dragging
				adapter.setDraggability(false);
				expect(map.dragPan?.enable).toHaveBeenCalledTimes(0);
				expect(map.dragPan?.disable).toHaveBeenCalledTimes(1);
				expect(map.dragRotate?.enable).toHaveBeenCalledTimes(0);
				expect(map.dragRotate?.disable).toHaveBeenCalledTimes(1);

				// Test enabling dragging
				adapter.setDraggability(true);
				expect(map.dragPan?.enable).toHaveBeenCalledTimes(1);
				expect(map.dragPan?.disable).toHaveBeenCalledTimes(1); // from setDraggability(false)
				expect(map.dragRotate?.enable).toHaveBeenCalledTimes(1);
				expect(map.dragRotate?.disable).toHaveBeenCalledTimes(1); // from setDraggability(false)
			});

			it("respects mixed pan/rotate settings when calling setDraggability", () => {
				const map = createMapLibreGLMap();

				// we expect it to disable both, but only re-enable drag pan
				map.dragPan!.isEnabled = jest.fn(() => true);
				map.dragRotate!.isEnabled = jest.fn(() => false);

				const adapter = new TerraDrawMapLibreGLAdapter({
					map: map as maplibregl.Map,
				});

				// Test disabling dragging
				adapter.setDraggability(false);
				expect(map.dragPan?.disable).toHaveBeenCalledTimes(1);
				expect(map.dragPan?.enable).toHaveBeenCalledTimes(0);
				expect(map.dragRotate?.disable).toHaveBeenCalledTimes(1);
				expect(map.dragRotate?.enable).toHaveBeenCalledTimes(0);

				// Test enabling dragging
				adapter.setDraggability(true);
				expect(map.dragPan?.disable).toHaveBeenCalledTimes(1);
				expect(map.dragPan?.enable).toHaveBeenCalledTimes(1);
				expect(map.dragRotate?.disable).toHaveBeenCalledTimes(1);
				expect(map.dragRotate?.enable).toHaveBeenCalledTimes(0);
			});

			describe("and the map was previously not dragable", () => {
				it("it does not re-enable pan/rotate settings", () => {
					const map = createMapLibreGLMap();
					map.dragPan!.isEnabled = jest.fn(() => false);
					map.dragRotate!.isEnabled = jest.fn(() => false);

					const adapter = new TerraDrawMapLibreGLAdapter({
						map: map as maplibregl.Map,
					});

					// Test enabling dragging
					adapter.setDraggability(false);
					expect(map.dragPan?.enable).toHaveBeenCalledTimes(0);
					expect(map.dragPan?.disable).toHaveBeenCalledTimes(1);
					expect(map.dragRotate?.enable).toHaveBeenCalledTimes(0);
					expect(map.dragRotate?.disable).toHaveBeenCalledTimes(1);

					// Test re-enabling dragging
					adapter.setDraggability(true);
					expect(map.dragPan?.enable).toHaveBeenCalledTimes(0);
					expect(map.dragPan?.disable).toHaveBeenCalledTimes(1);
					expect(map.dragRotate?.enable).toHaveBeenCalledTimes(0);
					expect(map.dragRotate?.disable).toHaveBeenCalledTimes(1);
				});
			});
		});

		describe("when enabling first", () => {
			it("it does nothing", () => {
				const map = createMapLibreGLMap();
				map.dragPan!.isEnabled = jest.fn(() => false);
				map.dragRotate!.isEnabled = jest.fn(() => false);

				const adapter = new TerraDrawMapLibreGLAdapter({
					map: map as maplibregl.Map,
				});

				adapter.setDraggability(true);
				expect(map.dragPan?.enable).toHaveBeenCalledTimes(0);
				expect(map.dragPan?.disable).toHaveBeenCalledTimes(0);
				expect(map.dragRotate?.enable).toHaveBeenCalledTimes(0);
				expect(map.dragRotate?.disable).toHaveBeenCalledTimes(0);
			});
		});

		describe("lazy re-snapshot: adapts to state change between construction and first setDraggability(false)", () => {
			it("does not re-enable dragPan if external code disabled it after adapter construction", () => {
				const map = createMapLibreGLMap();
				// At construction time: dragPan.isEnabled() returns true (default mock)
				const adapter = new TerraDrawMapLibreGLAdapter({
					map: map as maplibregl.Map,
				});

				// External code disables dragPan AFTER construction but before Terra Draw takes over
				map.dragPan!.isEnabled = jest.fn(() => false);

				// Terra Draw disables dragging — must snapshot current state (disabled)
				adapter.setDraggability(false);
				expect(map.dragPan?.disable).toHaveBeenCalledTimes(1);

				// Terra Draw re-enables — must NOT re-enable dragPan because snapshot captured it as disabled
				// (This differs from an eager constructor-time capture which would have seen it as enabled)
				adapter.setDraggability(true);
				expect(map.dragPan?.enable).toHaveBeenCalledTimes(0);
				expect(map.dragPan?.disable).toHaveBeenCalledTimes(1);
			});
		});
	});

	describe("project", () => {
		it("returns the correct lat lng as expected", () => {
			const map = createMapLibreGLMap();
			const adapter = new TerraDrawMapLibreGLAdapter({
				map: map as maplibregl.Map,
			});

			// Test enabling dragging
			adapter.project(0, 0);
			expect(map.project).toHaveBeenCalledTimes(1);
			expect(map.project).toHaveBeenCalledWith({ lat: 0, lng: 0 });
		});
	});

	describe("unproject", () => {
		it("returns the correct x y as expected", () => {
			const map = createMapLibreGLMap();
			const adapter = new TerraDrawMapLibreGLAdapter({
				map: map as maplibregl.Map,
			});

			// Test enabling dragging
			adapter.unproject(0, 0);
			expect(map.unproject).toHaveBeenCalledTimes(1);
			expect(map.unproject).toHaveBeenCalledWith({ x: 0, y: 0 });
		});
	});

	describe("setCursor", () => {
		it("sets the cursor correctly", () => {
			const map = createMapLibreGLMap();
			const adapter = new TerraDrawMapLibreGLAdapter({
				map: map as maplibregl.Map,
			});

			const container = {
				offsetLeft: 0,
				offsetTop: 0,
				style: { removeProperty: jest.fn(), cursor: "initial" },
			} as unknown as HTMLCanvasElement;

			map.getCanvas = jest.fn(() => container);

			adapter.setCursor("unset");

			expect(map.getCanvas).toHaveBeenCalledTimes(1);
			expect(container.style.removeProperty).toHaveBeenCalledTimes(1);

			adapter.setCursor("pointer");

			expect(map.getCanvas).toHaveBeenCalledTimes(2);
			expect(container.style.cursor).toBe("pointer");
		});

		describe("when a cursor is set and then unset", () => {
			it("restores the initial cursor", () => {
				const map = createMapLibreGLMap();
				const adapter = new TerraDrawMapLibreGLAdapter({
					map: map as maplibregl.Map,
				});

				const container = {
					offsetLeft: 0,
					offsetTop: 0,
					style: { removeProperty: jest.fn(), cursor: "initial" },
				} as unknown as HTMLCanvasElement;

				map.getCanvas = jest.fn(() => container);

				adapter.setCursor("pointer");
				expect(container.style.cursor).toBe("pointer");

				adapter.setCursor("unset");
				expect(container.style.cursor).toBe("initial");
			});
		});

		describe("when an onCursorChange callback is provided", () => {
			it("forwards the cursor intent to the callback instead of touching the canvas", () => {
				const map = createMapLibreGLMap();
				const onCursorChange = jest.fn();
				const adapter = new TerraDrawMapLibreGLAdapter({
					map: map as maplibregl.Map,
					onCursorChange,
				});

				const container = {
					offsetLeft: 0,
					offsetTop: 0,
					style: { removeProperty: jest.fn(), cursor: "initial" },
				} as unknown as HTMLCanvasElement;

				map.getCanvas = jest.fn(() => container);

				adapter.setCursor("pointer");
				expect(onCursorChange).toHaveBeenCalledTimes(1);
				expect(onCursorChange).toHaveBeenLastCalledWith("pointer");

				adapter.setCursor("unset");
				expect(onCursorChange).toHaveBeenCalledTimes(2);
				expect(onCursorChange).toHaveBeenLastCalledWith("unset");

				// Canvas cursor is left untouched — the host owns rendering.
				expect(map.getCanvas).not.toHaveBeenCalled();
				expect(container.style.cursor).toBe("initial");
				expect(container.style.removeProperty).not.toHaveBeenCalled();
			});
		});
	});

	describe("setDoubleClickToZoom", () => {
		it("enables and disables double click to zoom as expected", () => {
			const map = createMapLibreGLMap();
			const adapter = new TerraDrawMapLibreGLAdapter({
				map: map as maplibregl.Map,
			});

			adapter.setDoubleClickToZoom(true);

			expect(map.doubleClickZoom?.enable).toHaveBeenCalledTimes(1);

			adapter.setDoubleClickToZoom(false);

			expect(map.doubleClickZoom?.disable).toHaveBeenCalledTimes(1);
		});
	});

	describe("clear", () => {
		it("removes layers and sources correctly", () => {
			jest.spyOn(window, "requestAnimationFrame");

			const map = createMapLibreGLMap();
			const adapter = new TerraDrawMapLibreGLAdapter({
				map: map as maplibregl.Map,
			});

			adapter.register(MockCallbacks());

			adapter.render(
				{
					created: [],
					updated: [],
					unchanged: [],
					deletedIds: [],
				},
				{
					test: () => ({}) as TerraDrawAdapterStyling,
				},
			);
			const rAFCallback = (requestAnimationFrame as jest.Mock).mock.calls[0][0];
			rAFCallback();

			expect(map.addSource).toHaveBeenCalledTimes(3);
			expect(map.addLayer).toHaveBeenCalledTimes(5);
			expect(map.getSource).toHaveBeenCalledTimes(3);

			adapter.clear();

			expect(map.removeLayer).toHaveBeenCalledTimes(0);
			expect(map.removeSource).toHaveBeenCalledTimes(0);
			expect(map.getSource).toHaveBeenCalledTimes(6);
		});
	});

	describe("render", () => {
		it("creates layers and sources with no data passed", () => {
			jest.spyOn(window, "requestAnimationFrame");

			const map = createMapLibreGLMap();
			const adapter = new TerraDrawMapLibreGLAdapter({
				map: map as maplibregl.Map,
			});

			adapter.register(MockCallbacks());

			expect(map.addSource).toHaveBeenCalledTimes(3);
			expect(map.addLayer).toHaveBeenCalledTimes(5);

			adapter.render(
				{
					created: [],
					updated: [],
					unchanged: [],
					deletedIds: [],
				},
				{
					test: () => ({}) as TerraDrawAdapterStyling,
				},
			);

			const rAFCallback = (requestAnimationFrame as jest.Mock).mock.calls[0][0];

			rAFCallback();

			expect(map.addSource).toHaveBeenCalledTimes(3);
			expect(map.addLayer).toHaveBeenCalledTimes(5);
		});

		it("updates layers and sources when data is passed", () => {
			jest.spyOn(window, "requestAnimationFrame");

			const map = createMapLibreGLMap();
			const adapter = new TerraDrawMapLibreGLAdapter({
				map: map as maplibregl.Map,
			});

			expect(map.addSource).toHaveBeenCalledTimes(0);
			expect(map.addLayer).toHaveBeenCalledTimes(0);

			adapter.register(MockCallbacks());

			expect(map.addSource).toHaveBeenCalledTimes(3);
			expect(map.addLayer).toHaveBeenCalledTimes(5);

			expect(map.getSource).toHaveBeenCalledTimes(0);

			adapter.render(
				{
					created: [],
					updated: [],
					unchanged: [],
					deletedIds: [],
				},
				{
					test: () => ({}) as TerraDrawAdapterStyling,
				},
			);

			let rAFCallback = (requestAnimationFrame as jest.Mock).mock.calls[0][0];

			rAFCallback();

			// No additional sources or layers should be added
			expect(map.addSource).toHaveBeenCalledTimes(3);
			expect(map.addLayer).toHaveBeenCalledTimes(5);

			expect(map.getSource).toHaveBeenCalledTimes(3);

			adapter.render(
				{
					created: [
						{
							id: "1",
							type: "Feature",
							geometry: {
								type: "Point",
								coordinates: [1, 1],
							},
							properties: {
								mode: "point",
							},
						},
						{
							id: "2",
							type: "Feature",
							geometry: {
								type: "LineString",
								coordinates: [
									[0, 0],
									[1, 1],
								],
							},
							properties: {
								mode: "linestring",
							},
						},
						{
							id: "3",
							type: "Feature",
							geometry: {
								type: "Polygon",
								coordinates: [
									[
										[0, 0],
										[0, 100],
										[100, 100],
										[100, 0],
										[0, 0],
									],
								],
							},
							properties: {
								mode: "polygon",
							},
						},
					],
					updated: [],
					unchanged: [],
					deletedIds: [],
				},
				{
					point: () => ({}) as TerraDrawAdapterStyling,
					linestring: () => ({}) as TerraDrawAdapterStyling,
					polygon: () => ({}) as TerraDrawAdapterStyling,
				},
			);

			rAFCallback = (requestAnimationFrame as jest.Mock).mock.calls[1][0];

			rAFCallback();

			expect(map.getSource).toHaveBeenCalledTimes(6);

			adapter.render(
				{
					created: [],
					updated: [],
					unchanged: [],
					deletedIds: ["3"],
				},
				{
					point: () => ({}) as TerraDrawAdapterStyling,
					linestring: () => ({}) as TerraDrawAdapterStyling,
					polygon: () => ({}) as TerraDrawAdapterStyling,
				},
			);

			rAFCallback = (requestAnimationFrame as jest.Mock).mock.calls[2][0];

			rAFCallback();

			// Force update because of the deletion
			expect(map.getSource).toHaveBeenCalledTimes(9);
		});

		it("does not attempt to update after adapter is unregistered", () => {
			jest.spyOn(window, "requestAnimationFrame");

			const map = createMapLibreGLMap();
			const adapter = new TerraDrawMapLibreGLAdapter({
				map: map as maplibregl.Map,
			});

			expect(map.addSource).toHaveBeenCalledTimes(0);
			expect(map.addLayer).toHaveBeenCalledTimes(0);

			adapter.register(MockCallbacks());

			expect(map.addSource).toHaveBeenCalledTimes(3);
			expect(map.addLayer).toHaveBeenCalledTimes(5);

			adapter.render(
				{
					created: [],
					updated: [],
					unchanged: [],
					deletedIds: [],
				},
				{
					test: () => ({}) as TerraDrawAdapterStyling,
				},
			);

			let rAFCallback = (requestAnimationFrame as jest.Mock).mock.calls[0][0];

			rAFCallback();

			expect(map.addSource).toHaveBeenCalledTimes(3);
			expect(map.addLayer).toHaveBeenCalledTimes(5);

			adapter.render(
				{
					created: [
						{
							id: "1",
							type: "Feature",
							geometry: {
								type: "Point",
								coordinates: [1, 1],
							},
							properties: {
								mode: "point",
							},
						},
						{
							id: "2",
							type: "Feature",
							geometry: {
								type: "LineString",
								coordinates: [
									[0, 0],
									[1, 1],
								],
							},
							properties: {
								mode: "linestring",
							},
						},
						{
							id: "3",
							type: "Feature",
							geometry: {
								type: "Polygon",
								coordinates: [
									[
										[0, 0],
										[0, 100],
										[100, 100],
										[100, 0],
										[0, 0],
									],
								],
							},
							properties: {
								mode: "polygon",
							},
						},
					],
					updated: [],
					unchanged: [],
					deletedIds: [],
				},
				{
					point: () => ({}) as TerraDrawAdapterStyling,
					linestring: () => ({}) as TerraDrawAdapterStyling,
					polygon: () => ({}) as TerraDrawAdapterStyling,
				},
			);

			rAFCallback = (requestAnimationFrame as jest.Mock).mock.calls[1][0];

			expect(map.getSource).toHaveBeenCalledTimes(3);

			adapter.unregister();

			expect(map.removeLayer).toHaveBeenCalledTimes(5);
			expect(map.removeSource).toHaveBeenCalledTimes(3);

			// Clear updates the sources to empty
			expect(map.getSource).toHaveBeenCalledTimes(6);

			rAFCallback();

			// No further updates should be made after unregistering
			expect(map.getSource).toHaveBeenCalledTimes(6);
		});
	});

	describe("getCoordinatePrecision", () => {
		it("returns the default coordinate precision of 9", () => {
			const map = createMapLibreGLMap();
			const adapter = new TerraDrawMapLibreGLAdapter({
				map: map as maplibregl.Map,
			});

			adapter.register(MockCallbacks());

			expect(adapter.getCoordinatePrecision()).toBe(9);
		});

		it("returns the set coordinate precision of 6", () => {
			const map = createMapLibreGLMap();
			const adapter = new TerraDrawMapLibreGLAdapter({
				map: map as maplibregl.Map,
				coordinatePrecision: 6,
			});

			adapter.register(MockCallbacks());

			expect(adapter.getCoordinatePrecision()).toBe(6);
		});
	});

	describe("register and unregister", () => {
		const emptyRender = {
			created: [],
			updated: [],
			unchanged: [],
			deletedIds: [],
		};

		it("adds line-dasharray support when maplibre version is high enough", () => {
			const map = createMapLibreGLMap();
			(map as unknown as { version: string }).version = "5.8.0";

			const adapter = new TerraDrawMapLibreGLAdapter({
				map: map as maplibregl.Map,
			});

			adapter.register(MockCallbacks());

			const lineLayerCall = (map.addLayer as jest.Mock).mock.calls.find(
				([layer]) => (layer as { id?: string }).id === "td-linestring",
			);

			expect(lineLayerCall).toBeDefined();

			const lineLayer = lineLayerCall?.[0] as {
				paint?: { "line-dasharray"?: unknown };
			};

			expect(lineLayer.paint?.["line-dasharray"]).toEqual([
				"coalesce",
				["get", "lineStringDash"],
				["literal", [1, 0]],
			]);
		});

		it("does not add line-dasharray support when maplibre version is too low", () => {
			const map = createMapLibreGLMap();
			(map as unknown as { version: string }).version = "5.7.9";

			const adapter = new TerraDrawMapLibreGLAdapter({
				map: map as maplibregl.Map,
			});

			adapter.register(MockCallbacks());

			const lineLayerCall = (map.addLayer as jest.Mock).mock.calls.find(
				([layer]) => (layer as { id?: string }).id === "td-linestring",
			);

			expect(lineLayerCall).toBeDefined();

			const lineLayer = lineLayerCall?.[0] as {
				paint?: { "line-dasharray"?: unknown };
			};

			expect(lineLayer.paint?.["line-dasharray"]).toBeUndefined();
		});

		it("can register then unregister successfully", () => {
			jest.spyOn(window, "requestAnimationFrame");

			const map = createMapLibreGLMap();
			const adapter = new TerraDrawMapLibreGLAdapter({
				map: map as maplibregl.Map,
			});

			adapter.register(MockCallbacks());

			adapter.render(emptyRender, {
				test: () => ({}) as TerraDrawAdapterStyling,
			});

			const rAFCallback = (requestAnimationFrame as jest.Mock).mock.calls[0][0];

			rAFCallback();

			adapter.unregister();

			// Clears any set data
			expect(map.removeLayer).toHaveBeenCalledTimes(5);
			expect(map.removeSource).toHaveBeenCalledTimes(3);
		});

		it("can register -> unregister -> register successfully", () => {
			jest.spyOn(window, "requestAnimationFrame");

			const map = createMapLibreGLMap();
			const adapter = new TerraDrawMapLibreGLAdapter({
				map: map as maplibregl.Map,
			});

			adapter.register(MockCallbacks());

			adapter.render(emptyRender, {
				test: () => ({}) as TerraDrawAdapterStyling,
			});

			const rAFCallback = (requestAnimationFrame as jest.Mock).mock.calls[0][0];

			rAFCallback();

			adapter.unregister();

			// Clears any set data
			expect(map.removeLayer).toHaveBeenCalledTimes(5);
			expect(map.removeSource).toHaveBeenCalledTimes(3);

			// Re-register
			adapter.register(MockCallbacks());
		});

		it("moves layers respecting per-layer renderBelowLayerId properties", () => {
			const map = createMapLibreGLMap();
			const adapter = new TerraDrawMapLibreGLAdapter({
				map: map as maplibregl.Map,
				renderPointsBelowLayerId: "101",
				renderLinesBelowLayerId: "102",
				renderPolygonsBelowLayerId: "103",
			});

			adapter.register(MockCallbacks());

			// td-point-marker travels with td-point to the same target
			expect(map.moveLayer).toHaveBeenCalledTimes(5);
			expect(map.moveLayer).toHaveBeenCalledWith("td-point", "101");
			expect(map.moveLayer).toHaveBeenCalledWith("td-point-marker", "td-point");
			expect(map.moveLayer).toHaveBeenCalledWith("td-linestring", "102");
			expect(map.moveLayer).toHaveBeenCalledWith(
				"td-polygon-outline",
				"td-linestring",
			);
			expect(map.moveLayer).toHaveBeenCalledWith("td-polygon", "103");
		});

		it("reorders all layers before renderBelowLayerId when only that option is set", () => {
			const map = createMapLibreGLMap();
			const adapter = new TerraDrawMapLibreGLAdapter({
				map: map as maplibregl.Map,
				renderBelowLayerId: "mock-layer",
			});

			expect(map.moveLayer).toHaveBeenCalledTimes(0);

			adapter.register(MockCallbacks());

			// Compact chain — all layers stacked just below mock-layer in the correct
			// order (bottom→top): polygon, linestring, point, point-marker, mock-layer.
			// td-point and td-point-marker both go just below mock-layer first, then the
			// chain builds downward so nothing floats above the wrong layer.
			expect(map.moveLayer).toHaveBeenCalledTimes(5);
			expect(map.moveLayer).toHaveBeenCalledWith("td-point", "mock-layer");
			expect(map.moveLayer).toHaveBeenCalledWith(
				"td-point-marker",
				"mock-layer",
			);
			expect(map.moveLayer).toHaveBeenCalledWith("td-linestring", "td-point");
			expect(map.moveLayer).toHaveBeenCalledWith(
				"td-polygon-outline",
				"td-linestring",
			);
			expect(map.moveLayer).toHaveBeenCalledWith("td-polygon", "td-linestring");
		});
	});
});
