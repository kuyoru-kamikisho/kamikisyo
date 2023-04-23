<script setup lang="ts">
import {onMounted, watch} from "vue";
import {division, getSubMatrix, moveElement, parseTranslate3dString} from "@/script";
// —————————————————————— emits ——————————————————————
type RedrawEvent = {
  width: number // 处于交互状态的栅格的总宽度
  height: number // 处于交互状态的栅格的总高度
  row: number // 最小行占格
  col: number // 最小列占格
  left?: number // 左上角格子的坐标的x偏移
  top?: number // 左上角格子的坐标的y偏移
  dom?: HTMLElement // 受控制的元素
}

let emits = defineEmits<{
  (e: 'redraw', arg: RedrawEvent): void
}>();

// —————————————————————— props ——————————————————————
const props = withDefaults(defineProps<{
  watchDom?: HTMLElement // 监听的Dom元素，如果传入，则该Dom元素将成为实际与canvas进行交互的元素，如果不填，则交互元素是通过插槽进入的元素的根节点，与鼠标一致，同时只能有一个元素与画布交互，因此这不是一个数组
  width?: number          // 画布的宽度
  height?: number           // 画布的高度
  pointer?: boolean      // 是否启用鼠标交互，启用后画布会和鼠标进行交互，禁用后只会和内部元素交互
  round?: number        // 格子的圆角化程度，默认为0
  aspectRatio?: number     // 每一个格子的横向长度与纵向长度严格遵守的比例 如 16/9 或者 4/3，0表示禁用
  bgColor?: string          // 背景色
  cols?: number            // 期望的横向格子数，默认为12个，即列数
  gap?: number              // 矩形之间的间隔
  laWidth?: number      // 格子的宽度，一旦设置此项，格子的高度将根据纵横比设置，此选项必须与aspectRatio配合使用
  latIn?: string        // 被悬浮时的栅格填充色
  latOut?: string       // 无悬浮时的栅格填充色
  latSin?: string       // 被悬浮时的栅格描边色
  latSou?: string       // 无悬浮时的栅格描边色
  rows?: number            // 期望的纵向格子数，默认为12个，即行数
  sWidth?: number       // 描边宽度
  cover?: boolean        // 格子是否铺满，启用此选项会使格子铺满整个画布
  hvShadow?: [number, number, number, string] // 悬浮时添加阴影
  otShadow?: [number, number, number, string] // 正常状态的阴影
  movable?: boolean        // 子元素可拖拽
  sizeable?: boolean       // 子元素可扩展
  autoPlace?: boolean       // 自动分配空间和位置，禁用此项后元素的层级样式不会被接管
  autoSize?: boolean       // 自动调整元素的大小
}>(), {
  autoPlace: true,
  autoSize: true,
  movable: true,
  sizeable: true,
  pointer: true,
  round: 0,
  cover: false,
  width: 780,
  height: 440,
  aspectRatio: 1,
  cols: 12,
  gap: 0,
  bgColor: 'rgba(40,44,52,1)',
  latIn: 'rgb(241,25,25)',
  latOut: 'rgba(239,236,236,0.8)',
  latSin: 'rgba(0,0,0,0.56)',
  latSou: 'rgba(58,147,252,0.85)',
  rows: 12,
  sWidth: 1,
  hvShadow: () => [0, 0, 0, 'rgba(0,0,0,0)'],
  otShadow: () => [0, 0, 0, 'rgba(0,0,0,0)'],
});

// —————————————————————— data ——————————————————————
let corner_stack: Set<any> = new Set();
let movable_activated = false
let first_draw = true
let r_width: number
let r_height: number
let r_gap: number
let r_row_la_num: number
let r_col_la_num: number
let r_stroke_color: string
let r_stroke_color_hov: string
let r_not_hover: string
let r_bg_color: string
let r_hover_color: string
let r_line_width: number
let r_radius: number

// —————————————————————— watch ——————————————————————
watch([() => props.width, () => props.height], () => {
  main_render()
})

// —————————————————————— fun ——————————————————————

/**
 * ## 钢笔工具1
 *
 * 创建一个圆角矩形的路径
 *
 * @param ctx
 * @param x 起始点 x
 * @param y 起始点 y
 * @param radius 圆角半径
 * @param width 矩形宽度
 * @param height 矩形高度
 */
function pen(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, width: number, height: number) {
  ctx.beginPath();
  // 上直线
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  // 右上角
  ctx.arc(x + width - radius, y + radius, radius, -Math.PI / 2, 0);
  // 右直线
  ctx.lineTo(x + width, y + height - radius);
  // 右下角
  ctx.arc(x + width - radius, y + height - radius, radius, 0, Math.PI / 2);
  // 下直线
  ctx.lineTo(x + radius, y + height);
  // 左下角
  ctx.arc(x + radius, y + height - radius, radius, Math.PI / 2, Math.PI);
  // 左直线
  ctx.lineTo(x, y + radius);
  // 左上角
  ctx.arc(x + radius, y + radius, radius, Math.PI, -Math.PI / 2);
  // 路径创建结束，闭合
  ctx.closePath();
}

/**
 * ## 为路径创建阴影
 * @param ctx
 * @param x 偏移量x
 * @param y 偏移量y
 * @param depth 阴影深度
 * @param color 颜色
 */
function drawShadow(ctx: CanvasRenderingContext2D, x: number, y: number, depth: number, color = 'black') {
  ctx.shadowOffsetX = x;
  ctx.shadowOffsetY = y;
  ctx.shadowBlur = depth;
  ctx.shadowColor = color;
}

/**
 * ## 重置画布
 * 并且为画布增加背景色
 * @param ctx
 * @param c 画布的背景色
 * @param canvas
 */
function reDraw(ctx: CanvasRenderingContext2D, c: string, canvas: HTMLCanvasElement) {
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = c
  ctx.fillRect(0, 0, canvas.width, canvas.height)
}

/**
 * ## 初始化变量
 */
function init_var(canvas: HTMLCanvasElement) {
  r_width = props.laWidth || props.width / props.rows;  // 格子的宽度
  r_height = props.height / props.cols;  // 格子的高度
  r_gap = props.gap;     // 格子之间的距离
  r_row_la_num = props.rows;  // 横向的格子数量，即几列
  r_col_la_num = props.cols;  // 纵向的格子数量，即几行
  r_stroke_color = props.latSou; // 普通描边色
  r_stroke_color_hov = props.latSin; // 被悬浮时的描边色
  r_not_hover = props.latOut;
  r_bg_color = props.bgColor; // 画布的背景色
  r_hover_color = props.latIn;
  r_line_width = props.sWidth; // 线宽
  r_radius = props.round; // 圆角半径

  // 根据格子比例重设格子高度
  if (props.aspectRatio) {
    r_height = r_width * props.aspectRatio
  }

  if (props.cover) {
    if (!props.laWidth) {
      if (r_row_la_num)
        r_width = canvas.width / r_row_la_num - r_gap
      if (r_col_la_num)
        r_height = canvas.height / r_col_la_num - r_gap
    } else {
      r_row_la_num = (canvas.width - r_gap) / (r_width + r_gap)
      r_col_la_num = (canvas.height - r_gap) / (r_height + r_gap)
    }
  }
}

/**
 * ## 绘制格子矩阵
 * * 绘制 10 * 10 的圆角格子矩阵
 * @param canvas
 */
function render(canvas: HTMLCanvasElement) {
  let ctx = canvas.getContext('2d')!;
  // 初始化阶段
  init_var(canvas)
  reDraw(ctx, r_bg_color, canvas)
  ctx.lineWidth = r_line_width;
  ctx.strokeStyle = r_stroke_color;

  for (let i = 0; i < r_row_la_num; i++) {
    for (let j = 0; j < r_col_la_num; j++) {
      const x = i * (r_width + r_gap) + r_gap;
      const y = j * (r_height + r_gap) + r_gap;
      // 在该位置绘制矩形
      pen(ctx, x, y, r_radius, r_width, r_height)
      ctx.fillStyle = r_not_hover;
      // 描边
      ctx.fill()
      ctx.stroke();
    }
  }

  // 自动分配空间
  autoOccupy(r_width, r_height, r_gap, r_col_la_num, r_row_la_num)

  // 与鼠标/元素交互
  if (props.pointer) {
    let rectX, rectY;
    let x, y;

    // 每次鼠标的移动都会触发重绘
    canvas.addEventListener('mousemove', (event) => {
      reDraw(ctx, r_bg_color, canvas)
      x = event.offsetX;
      y = event.offsetY;

      for (let i = 0; i < r_row_la_num; i++) {
        for (let j = 0; j < r_col_la_num; j++) {
          rectX = i * (r_width + r_gap) + r_gap;
          rectY = j * (r_height + r_gap) + r_gap;
          pen(ctx, rectX, rectY, r_radius, r_width, r_height)
          if (x >= rectX && x <= rectX + r_width && y >= rectY && y <= rectY + r_height) {
            ctx.strokeStyle = r_stroke_color_hov
            ctx.fillStyle = r_hover_color;
            emits('redraw', {
              width: r_width,
              height: r_height,
              row: 1,
              col: 1,
              left: rectX,
              top: rectY
            })
          } else {
            ctx.strokeStyle = r_stroke_color
            ctx.fillStyle = r_not_hover;
          }
          ctx.fill();
          ctx.stroke();
        }
      }
    });
  } else {
    // 与元素交互
    let box = document.querySelector('.k-adb-box');

    if (box) {
      let can: HTMLCanvasElement;
      let tat: any;
      let rectX, rectY,
          rect1, rect2,
          left, top, position,
          rz, cz, w, h;

      let x1: any, y1: any,
          x2: any, y2: any

      let listener = (e: Event) => {
        can = document.querySelector('.k-adb-canvas')!;
        ctx = can.getContext('2d')!
        tat = props.watchDom ?? e.target;

        if (tat && tat !== can) {
          rect1 = tat.getBoundingClientRect();
          rect2 = can!.getBoundingClientRect();

          left = rect1.left - rect2.left;
          top = rect1.top - rect2.top;

          position = {
            left: left,
            top: top,
            right: left + rect1.width,
            bottom: top + rect1.height,
          };

          reDraw(ctx, props.bgColor, can)
          x1 = position.left;
          y1 = position.top;
          x2 = position.right;
          y2 = position.bottom;

          // 重绘触发事件该交互元素在自动放置时所应该具备的最小宽度与高度
          rz = division(rect1.width, r_width + r_gap);
          cz = division(rect1.height, r_height + r_gap);
          w = rz * r_width + r_gap * (rz - 1)
          h = cz * r_height + r_gap * (cz - 1)
          rectX = Math.floor((left / (r_width + r_gap))) * (r_width + r_gap) + r_gap
          rectY = Math.floor((top / (r_height + r_gap))) * (r_height + r_gap) + r_gap
          emits('redraw', {
            width: w,
            height: h,
            row: rz,
            col: cz,
            left: rectX,
            top: rectY
          })

          for (let i = 0; i < r_row_la_num; i++) {
            for (let j = 0; j < r_col_la_num; j++) {
              rectX = i * (r_width + r_gap) + r_gap;
              rectY = j * (r_height + r_gap) + r_gap;
              pen(ctx, rectX, rectY, r_radius, r_width, r_height)
              if (x2 >= rectX && x1 < rectX + r_width && y2 >= rectY && y1 < rectY + r_height) {
                ctx.strokeStyle = r_stroke_color_hov
                ctx.fillStyle = r_hover_color;
              } else {
                ctx.strokeStyle = r_stroke_color
                ctx.fillStyle = r_not_hover;
              }
              ctx.fill();
              ctx.stroke();
            }
          }
        }
      };

      if (first_draw) {
        box.addEventListener('mousemove', listener)
      }
    }
  }
}

/**
 * ## 捕获插入进来的所有元素并自动分配位置与大小
 * 接管元素的位置大小以及定位
 * 天生具备坐标偏移的元素优先分配
 * @param lw 格子宽度
 * @param lh 格子高度
 * @param lg 格子间距
 * @param rn 总行数
 * @param cn 总列数
 */
function autoOccupy(lw: number, lh: number, lg: number, rn: number, cn: number) {
  let zrs, zcs, str, zds;
  let ofl, oft, xPos, yPos;

  let cmn: HTMLElement[] = [];
  let mcr: number[][] = []

  let w, h;
  let box: any = document.querySelector('.k-adb-inner')!;
  let children: any = box.children;
  let child, tra, n3d;
  let min_rows: number, min_cols: number;

  for (let i = 0; i < children.length; i++) {
    child = children[i];
    child.style.position = 'absolute'
    tra = child.style.transform;
    n3d = parseTranslate3dString(tra);

    // 使元素可以被拖拽
    if (props.movable && !movable_activated) {
      moveElement(child)
    }

    // 元素需要在一行/列上占据的格子数
    min_rows = division(child.offsetWidth, lw + lg)
    min_cols = division(child.offsetHeight, lh + lg)
    // 这个元素的左上和右下两个顶角的坐标


    // 重设元素的大小
    w = min_rows * lw + lg * (min_rows - 1);
    h = min_cols * lh + lg * (min_cols - 1);
    if (props.autoSize) {
      child.style.width = w + 'px'
      child.style.height = h + 'px'
    }

    // 空间分配
    if (props.autoPlace) {
      if (n3d.length > 0) {
        ofl = Math.floor((n3d[0] - lg) / (lw + lg));
        oft = Math.floor((n3d[1] - lg) / (lh + lg));
        xPos = lg + ofl * (lw + lg);
        yPos = lg + oft * (lw + lg);

        let subMatrix = getSubMatrix(ofl, oft, min_rows, min_cols);

        corner_stack = new Set([...corner_stack, ...subMatrix])
        child.style.transform = `translate3d(${xPos}px, ${yPos}px, 0)`
      } else {
        cmn.push(child)
        mcr.push([min_cols, min_rows])
      }
    }

    emits('redraw', {
      width: w,
      height: h,
      row: min_rows,
      col: min_cols,
      left: xPos,
      top: yPos,
      dom: child
    })
  }

  // 无论是否被激活，循环结束后都设置为激活状态
  movable_activated = true

  cmn.forEach(c => {
    let pop = mcr.pop()!;
    searchMyPlace(pop[0], pop[1], c)
  })

  /**
   * ## 寻找空余位置并分配
   * @param min_cols 元素在一列上需要占据的格子数
   * @param min_rows 元素在一行上需要占据的格子数
   * @param child 元素
   * @param fro 从第fro[0]行第fro[1]列开始检索是否可以被占用
   */
  function searchMyPlace(min_cols: number, min_rows: number, child: any, fro = [0, 0]): any {
    // 这个元素在该行/列预占用的格子数
    zrs = 0
    zcs = 0

    str = ''
    zds = []
    for (let j = fro[0]; j < rn; j++) {
      // 进入新行检索时重置在该行预占用的格子数
      zrs = 0

      for (let k = fro[1]; k < cn; k++) {
        // 从第j行的第k列开始尝试占用
        str = j + '' + k

        // 如果这个格子没有被占用
        if (!corner_stack.has(str)) {
          zds.push(str)
          zrs += 1

          // 如果在该行预占用的格子数等于元素在一行上需要占据的格子数
          // 结束对该行的检索，进入下一行
          if (zrs === min_rows) {
            break
          }
        } else {
          // 如果这个格子被占用了，行标不变，列标向后移动一格重新查找
          return searchMyPlace(min_cols, min_rows, child, [j, k + 1])
        }
      }

      // 进行到这里说明这一行可以被占据
      zcs += 1

      // 如果元素在该列上需要占据的格子数等于这个元素在该列预占用的格子数
      if (zcs === min_cols) {
        // 此时已经查找到了完美的左上顶点
        let xPos = lg + fro[1] * (lw + lg)
        let yPos = lg + fro[0] * (lh + lg)
        child.style.transform = `translate3d(${xPos}px, ${yPos}px, 0)`
        corner_stack = new Set([...corner_stack, ...zds])
        break
      }
    }
  }
}

/**
 * ## 渲染程序主入口
 */
function main_render() {
  if (props.width > 0 && props.height > 0) {
    // 先移除旧的canvas
    let cv = document.querySelector('.k-adb-canvas');
    cv?.remove()
    // 创建 canvas 元素
    const canvas = document.createElement('canvas');
    const parent = document.querySelector('.k-adb-box');

    // 设置 canvas 元素的 class 属性
    canvas.className = 'k-adb-canvas';

    // 设置 canvas 元素的 width 和 height 属性
    canvas.width = props.width;
    canvas.height = props.height;

    // 将 canvas 元素添加到文档中的某个元素中
    const child_2 = document.querySelector('.k-adb-inner');
    parent?.insertBefore(canvas, child_2)

    render(canvas)
    // 避免浪费性能
    first_draw = false
  }
}

// —————————————————————— life ——————————————————————
onMounted(() => {
  main_render()
})

</script>

<template>
  <div :style="`max-width:${width}px;max-height:${height}px;`" class="k-adb-box">
    <!--  canvas将被插入在这里  -->
    <div class="k-adb-inner">
      <slot>
        <!-- 组件会自动接管所有插入进来的dom元素并控制他们的位置、大小等信息 -->
      </slot>
    </div>
  </div>
</template>

<style lang="scss">
.k-adb-box {
  position: relative;

  .k-adb-canvas {
    position: absolute;
    left: 0;
    top: 0;
  }
}
</style>