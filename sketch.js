var img; //array of micro images
var macroimg; //macroimage source file
//var post_num;
var cnt;
var w, h;
var dx, dy;
var micro_hist; //histogram - microimages sorted in matrix by average brightness
var micro_avg; //average brightness of all microimages
var hist_interval;
var k;
var macro_w, macro_h; //number of segments in row and number of segments in column in macroimage 
var max_seg; //maximum number of segments

//function preload() {
//}
function setup() {
  //parameters for microimage normalization; resize, crop...
  dx = 60;
  dy = 60;
  cnt = 0;
  img = [];
  k = 1;
  max_seg = 100;


  //structure for holding brightness-sorted micromages; array of arrays...
  hist_interval = 5; //interval value 5 will sort images in groups where images' brightness is in 0 - 5, 5 - 10, 10 - 15...
  micro_hist = [];
  for (h = 0; h < 256; h += hist_interval) {
    micro_hist[h / hist_interval] = [];
  }

  createCanvas(max_seg*dx, max_seg*dy);
  background(255);

  // Macroimage input
  textSize(18); 
  text("Select macro image:", 20, 20); 
  
  macroimg_input = createFileInput(loadMacroimg); 
  macroimg_input.position(30, 40); 

  // Microimages input:
  text("Select micro images:", 220, 20); 

  microimg_input = createFileInput(loadMicroimg, true); 
  microimg_input.position(230, 40); 

  w = displayWidth;
  h = displayHeight;
  noLoop();
}

function draw() {
  if (macroimg) {
    normalize_images(img, dx, dy, k);
    draw_macro();
  }
}

function loadMacroimg(file) {
  print(file);
  if (file.type === 'image') {
    macroimg = loadImage(file.data, macroImage_success);
  } else {
    macroimg = null;
  }
}

function macroImage_success() {
  if (macroimg.width > macroimg.height) {
    macro_w = max_seg;
    macro_h = floor(macroimg.height*macro_w/macroimg.width)
  } else {
    macro_h = max_seg;
    macro_w = floor(macroimg.width*macro_h/macroimg.height)
  }
  redraw();
}

function loadMicroimg(file) {
  print(file);
  if (file.type === 'image') {
    img[cnt] = loadImage(file.data);
    console.log("Loaded micro image index:", cnt);
    cnt++;
  }
}

function normalize_images(img, dx, dy, k) {
  var gab = 0; //global average brightness; ditribution mean... 
  for (q = 0; q < img.length; q++) { //for each microimage...
    console.log("Normalizing image with index:", q);

    //resize the microimage to allow (dx,dy) area to be cropped 
    var cx = img[q].width / dx;
    var cy = img[q].height / dy;
    if (cx < cy) {
      img[q].resize(k * dx, 0);
    } else {
      img[q].resize(0, k * dy);
    }

    //make it black&white...
    img[q].filter('gray');

    //crop the central dx,dy area..
    var y0 = round((img[q].height - dy) / 2);
    var x0 = round((img[q].width - dx) / 2);
    var t_img = img[q].get(x0, y0, dx, dy);

    //calculate the average brightness for each microimage
    t_img.loadPixels();
    var b = 0; //brightness
    for (let x = 0; x < t_img.width; x++) {
      for (let y = 0; y < t_img.height; y++) {
        // Calculate the 1D location from a 2D grid
        let loc = (x + y * t_img.width) * 4;
        b += t_img.pixels[loc];
      }
    }
    var ab = round(b / t_img.pixels.length); //average brightness of one microimage
    gab += ab;

    //store the microimage in histogram
    var index = floor(ab / hist_interval);
    micro_hist[index].push(t_img);
    //histogram(index,micro_hist[index].length);

    //console.log(ab);
    //writer.print(ab);

    //resize the source macroimage
    macroimg.resize(macro_w * dx, macro_h * dy);

    //make it black&white
    macroimg.filter('gray');


    img[q] = t_img;
  }
  micro_avg = round(gab / img.length);
  console.log("Average microimages brightness:", micro_avg);
  for (let i = 0; i < micro_hist.length; i++) {
    console.log("Microimages histogram");
    var lb = (i -1)*hist_interval;
    var ub = i*hist_interval;
    var num = micro_hist[i].length;
    console.log(lb,"-",ub,":",num);
  }
}

function draw_macro() {
  var gab = 0; //global average brightness for all macroimage squares
  var dist; //distance between means...
  var ab = []; //array of average brightnesses for squares...
  for (x = 0; x < macro_w; x++) {
    for (y = 0; y < macro_h; y++) {
      var ind = x * macro_h + y; //square index
      var t_img = macroimg.get(x * dx, y * dy, dx, dy);

      //calculate the average brightness for each square
      t_img.loadPixels();
      var b = 0; //brightness
      //console.log("t_img.width:",t_img.width,"t_img.height". t_img.height);
      console.log("t_img.width:",t_img.width);
      console.log("t_img.height:",t_img.height);
      for (let sx = 0; sx < t_img.width; sx++) {
        for (let sy = 0; sy < t_img.height; sy++) {
          // Calculate the 1D location from a 2D grid
          let loc = (sx + sy * t_img.width) * 4;
          b += t_img.pixels[loc];
        }
      }
      ab[ind] = round(b / t_img.pixels.length); //average brightness of one square
      console.log("ab[",ind,"]:", ab[ind]);
      gab += ab[ind];
    }
  }
  gab = round(gab / (macro_w*macro_h));
  console.log("Average macroimage brightness:", gab);
  dist = gab - micro_avg;
  for (i = 0; i < ab.length; i++) {
    var ab_norm = ab[i] - dist; //square brightness normalized to the mean of microimage set...
    //console.log('ab_norm ab[i] dist: ',ab_norm,ab[i],dist);
    if (ab_norm < 0) {
      ab_norm = 0;
    }
    if (ab_norm > 255) {
      ab_norm = 255;
    }
    var hist_ind = floor(ab_norm / hist_interval);
    //console.log("original hist_ind: ", hist_ind)
    if (hist_ind < 0) {
      hist_ind = 0;
    }
    if (hist_ind >= micro_hist.length) {
      hist_ind = 5;
    }
    var index_pair = get_micro_ind(hist_ind, ab_norm);
    var x = floor(i / 100);
    var y = i - x * 100;
    console.log("micro_hist[",index_pair[0],"][",index_pair[1],"]");
    image(micro_hist[index_pair[0]][index_pair[1]], x * dx, y * dy);
  }
}

function get_micro_ind(hist_ind, ab_norm) {
  //console.log("hist_ind in function: ",hist_ind);
  var index_pair = [];
  if (micro_hist[hist_ind].length) {
    index_pair[0] = hist_ind;
    index_pair[1] = floor(random(0, micro_hist[hist_ind].length));
  } else {
    if (ab_norm > micro_avg) {
      hist_ind--;
      if (hist_ind < 0) {
        hist_ind = 5;
      }
    } else {
      hist_ind++;
      if (hist_ind >= micro_hist.length) {
        hist_ind = 5;
      }
    }
    index_pair = get_micro_ind(hist_ind, ab_norm);
  }
  return index_pair;
}

function histogram(a,b) {
  var dx = 10;
  var dy = 10;
  var x = w/3 + a*dx;
  var y = 0.75*h - b*dy;
  rect(x,y,5,5);
  redraw();
}